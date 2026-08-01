import AppKit
import Vision

struct Word: Codable {
  let text: String
  let x: Double
  let y: Double
  let width: Double
  let height: Double
  let confidence: Double
}

guard CommandLine.arguments.count == 2 else {
  FileHandle.standardError.write(Data("Usage: apple-vision-ocr.swift <chart-image>\n".utf8))
  exit(2)
}

let imagePath = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: imagePath) else {
  FileHandle.standardError.write(Data("Unable to read chart image.\n".utf8))
  exit(2)
}

var imageRect = NSRect(origin: .zero, size: image.size)
guard let cgImage = image.cgImage(forProposedRect: &imageRect, context: nil, hints: nil) else {
  FileHandle.standardError.write(Data("Unable to convert chart image.\n".utf8))
  exit(2)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.minimumTextHeight = 0.008

do {
  try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
  let words = (request.results ?? []).compactMap { observation -> Word? in
    guard let candidate = observation.topCandidates(1).first else { return nil }
    let box = observation.boundingBox
    return Word(
      text: candidate.string,
      x: Double(box.origin.x),
      y: Double(box.origin.y),
      width: Double(box.size.width),
      height: Double(box.size.height),
      confidence: Double(candidate.confidence)
    )
  }
  let data = try JSONEncoder().encode(words)
  FileHandle.standardOutput.write(data)
} catch {
  FileHandle.standardError.write(Data("Apple Vision OCR failed: \(error.localizedDescription)\n".utf8))
  exit(1)
}
