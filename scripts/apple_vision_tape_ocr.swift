import AppKit
import CoreImage
import Foundation
import Vision

struct TapeTextDetection: Codable {
    let value: Int
    let x: Double
    let y: Double
    let confidence: Double
    let raw: String
}

struct TapeTextOutput: Codable {
    let imageWidth: Int
    let imageHeight: Int
    let hintX: Double
    let centerLineSlope: Double
    let centerLineIntercept: Double
    let detections: [TapeTextDetection]
}

guard CommandLine.arguments.count >= 3 else {
    FileHandle.standardError.write(Data("Usage: apple_vision_tape_ocr <image> <hint-x>\n".utf8))
    exit(2)
}

let imageURL = URL(fileURLWithPath: CommandLine.arguments[1])
guard
    let hintX = Double(CommandLine.arguments[2]),
    let image = NSImage(contentsOf: imageURL),
    let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
    FileHandle.standardError.write(Data("Could not read the tape image.\n".utf8))
    exit(2)
}

let imageWidth = Double(cgImage.width)
let imageHeight = Double(cgImage.height)
let ciContext = CIContext(options: [.useSoftwareRenderer: false])
let rectifiedMode = CommandLine.arguments.count >= 4 && CommandLine.arguments[3] == "rectified"
let enlargementScale = rectifiedMode ? 12.0 : 4.0

func numericValue(in raw: String) -> Int? {
    let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let range = trimmed.range(
        of: "(?<![0-9])[0-9]{1,3}(?![0-9])",
        options: .regularExpression
    ) else {
        return nil
    }
    guard let value = Int(trimmed[range]), value >= 0, value <= 250 else { return nil }
    return value
}

func recognize(region: CGRect) throws -> [TapeTextDetection] {
    let cropRect = CGRect(
        x: region.minX * imageWidth,
        y: (1 - region.maxY) * imageHeight,
        width: region.width * imageWidth,
        height: region.height * imageHeight
    ).integral.intersection(CGRect(x: 0, y: 0, width: imageWidth, height: imageHeight))
    guard cropRect.width > 1, cropRect.height > 1,
          let cropped = cgImage.cropping(to: cropRect) else { return [] }
    let source = CIImage(cgImage: cropped)
    let enlarged = source
        .transformed(by: CGAffineTransform(scaleX: enlargementScale, y: enlargementScale))
        .applyingFilter("CIColorControls", parameters: [
            kCIInputSaturationKey: 0,
            kCIInputContrastKey: 1.5,
        ])
        .applyingFilter("CISharpenLuminance", parameters: [kCIInputSharpnessKey: 0.6])
    guard let recognitionImage = ciContext.createCGImage(enlarged, from: enlarged.extent) else { return [] }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.recognitionLanguages = ["en-US"]
    request.customWords = (0...250).map(String.init)
    // Printed tape digits can be only a few pixels tall in a full-body photo.
    // OCR the enlarged crop instead of asking Vision to find them in the full frame.
    request.minimumTextHeight = 0.008
    try VNImageRequestHandler(cgImage: recognitionImage).perform([request])

    return (request.results ?? []).flatMap { observation -> [TapeTextDetection] in
        for candidate in observation.topCandidates(5) {
            guard let value = numericValue(in: candidate.string) else { continue }
            let box = observation.boundingBox
            return [TapeTextDetection(
                value: value,
                x: cropRect.minX + (box.midX * cropRect.width),
                y: cropRect.minY + ((1 - box.midY) * cropRect.height),
                confidence: Double(candidate.confidence),
                raw: candidate.string
            )]
        }
        return []
    }
}

func regions(
    bandCenter: (Double) -> Double,
    bandWidthPx: Double,
    tileHeightPx: Double,
    stepPx: Double
) -> [CGRect] {
    var result: [CGRect] = []
    var topPx = 0.0
    while topPx < imageHeight {
        let bottomPx = min(imageHeight, topPx + tileHeightPx)
        let middleY = (topPx + bottomPx) / 2
        let centerX = bandCenter(middleY)
        let leftPx = max(0, min(imageWidth - 1, centerX - (bandWidthPx / 2)))
        let rightPx = max(leftPx + 1, min(imageWidth, centerX + (bandWidthPx / 2)))
        let bottomOriginY = imageHeight - bottomPx
        result.append(CGRect(
            x: leftPx / imageWidth,
            y: bottomOriginY / imageHeight,
            width: (rightPx - leftPx) / imageWidth,
            height: (bottomPx - topPx) / imageHeight
        ))
        topPx += stepPx
    }
    return result
}

func median(_ values: [Double]) -> Double? {
    guard !values.isEmpty else { return nil }
    let sorted = values.sorted()
    let middle = sorted.count / 2
    return sorted.count.isMultiple(of: 2)
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle]
}

func fitLine(_ detections: [TapeTextDetection], fallbackX: Double) -> (slope: Double, intercept: Double) {
    guard detections.count >= 4 else { return (0, fallbackX) }
    let meanY = detections.reduce(0) { $0 + $1.y } / Double(detections.count)
    let meanX = detections.reduce(0) { $0 + $1.x } / Double(detections.count)
    let denominator = detections.reduce(0) { $0 + pow($1.y - meanY, 2) }
    guard denominator > 1 else { return (0, fallbackX) }
    let slope = detections.reduce(0) { $0 + (($1.y - meanY) * ($1.x - meanX)) } / denominator
    guard slope.isFinite, abs(slope) < 0.25 else { return (0, fallbackX) }
    return (slope, meanX - (slope * meanY))
}

do {
    let firstPassRegions = regions(
        bandCenter: { _ in hintX },
        bandWidthPx: min(rectifiedMode ? 64 : 520, imageWidth),
        tileHeightPx: min(rectifiedMode ? 140 : 700, imageHeight),
        stepPx: min(rectifiedMode ? 100 : 480, imageHeight)
    )
    var firstPass: [TapeTextDetection] = []
    for region in firstPassRegions {
        firstPass.append(contentsOf: try recognize(region: region))
    }

    let nearHint = firstPass.filter { abs($0.x - hintX) <= 80 }
    let medianX = median(nearHint.map(\.x)) ?? hintX
    let lineCandidates = nearHint.filter { abs($0.x - medianX) <= 45 }
    let centerLine = fitLine(lineCandidates, fallbackX: medianX)

    let fineRegions = regions(
        bandCenter: { y in centerLine.intercept + (centerLine.slope * y) },
        bandWidthPx: min(rectifiedMode ? 60 : 180, imageWidth),
        tileHeightPx: min(rectifiedMode ? 22 : 560, imageHeight),
        stepPx: min(rectifiedMode ? 9 : 360, imageHeight)
    )
    var fine: [TapeTextDetection] = []
    for region in fineRegions {
        fine.append(contentsOf: try recognize(region: region))
    }

    let output = TapeTextOutput(
        imageWidth: cgImage.width,
        imageHeight: cgImage.height,
        hintX: hintX,
        centerLineSlope: centerLine.slope,
        centerLineIntercept: centerLine.intercept,
        detections: firstPass + fine
    )
    let encoder = JSONEncoder()
    let data = try encoder.encode(output)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
} catch {
    FileHandle.standardError.write(Data("Apple Vision tape OCR failed: \(error)\n".utf8))
    exit(1)
}
