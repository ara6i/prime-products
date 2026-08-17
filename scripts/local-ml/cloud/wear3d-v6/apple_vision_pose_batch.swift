#!/usr/bin/env swift

import Foundation
import Vision
import CoreImage

struct Arguments {
    let inputDirectory: URL
    let inputList: URL?
    let outputURL: URL
    let suffix: String
    let limit: Int?
    let maxNew: Int?

    init() throws {
        var inputDirectory: URL?
        var inputList: URL?
        var outputURL: URL?
        var suffix = "-front-50.png"
        var limit: Int?
        var maxNew: Int?
        var index = 1
        while index < CommandLine.arguments.count {
            let argument = CommandLine.arguments[index]
            switch argument {
            case "--input-dir":
                index += 1
                guard index < CommandLine.arguments.count else { throw UsageError() }
                inputDirectory = URL(fileURLWithPath: CommandLine.arguments[index], isDirectory: true)
            case "--output":
                index += 1
                guard index < CommandLine.arguments.count else { throw UsageError() }
                outputURL = URL(fileURLWithPath: CommandLine.arguments[index])
            case "--input-list":
                index += 1
                guard index < CommandLine.arguments.count else { throw UsageError() }
                inputList = URL(fileURLWithPath: CommandLine.arguments[index])
            case "--suffix":
                index += 1
                guard index < CommandLine.arguments.count else { throw UsageError() }
                suffix = CommandLine.arguments[index]
            case "--limit":
                index += 1
                guard index < CommandLine.arguments.count, let parsed = Int(CommandLine.arguments[index]), parsed > 0 else {
                    throw UsageError()
                }
                limit = parsed
            case "--max-new":
                index += 1
                guard index < CommandLine.arguments.count, let parsed = Int(CommandLine.arguments[index]), parsed > 0 else {
                    throw UsageError()
                }
                maxNew = parsed
            default:
                throw UsageError()
            }
            index += 1
        }
        guard let inputDirectory, let outputURL else { throw UsageError() }
        self.inputDirectory = inputDirectory
        self.inputList = inputList
        self.outputURL = outputURL
        self.suffix = suffix
        self.limit = limit
        self.maxNew = maxNew
    }
}

struct UsageError: Error {}

struct ImageInput {
    let scanID: String
    let imageURL: URL
    let relativePath: String
}

let requiredJoints: [(key: String, name: VNHumanBodyPose3DObservation.JointName)] = [
    ("left_shoulder", .leftShoulder),
    ("right_shoulder", .rightShoulder),
    ("left_hip", .leftHip),
    ("right_hip", .rightHip),
]

let required2DJoints: [(key: String, name: VNHumanBodyPoseObservation.JointName)] = [
    ("left_shoulder", .leftShoulder),
    ("right_shoulder", .rightShoulder),
    ("left_hip", .leftHip),
    ("right_hip", .rightHip),
]

func jsonLine(_ object: [String: Any]) throws -> Data {
    var data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    data.append(0x0a)
    return data
}

func scanID(from filename: String, suffix: String) -> String {
    guard filename.hasSuffix(suffix) else { return filename }
    return String(filename.dropLast(suffix.count))
}

func existingScanIDs(at outputURL: URL) -> Set<String> {
    guard let data = try? Data(contentsOf: outputURL), let text = String(data: data, encoding: .utf8) else {
        return []
    }
    var keys = Set<String>()
    text.enumerateLines { line, _ in
        guard let lineData = line.data(using: .utf8),
              let object = try? JSONSerialization.jsonObject(with: lineData) as? [String: Any],
              object["accepted"] as? Bool == true,
              let scanID = object["scan_id"] as? String else { return }
        keys.insert(scanID)
    }
    return keys
}

func anchorCoordinate(_ anchors: [String: Any], _ name: String, _ axis: String) -> Double? {
    guard let point = anchors[name] as? [String: Any],
          let value = point[axis] as? NSNumber else { return nil }
    return value.doubleValue
}

func anchorGeometryIsValid(_ anchors: [String: Any]) -> Bool {
    guard
        let leftShoulderX = anchorCoordinate(anchors, "left_shoulder", "x_norm"),
        let leftShoulderY = anchorCoordinate(anchors, "left_shoulder", "y_norm"),
        let rightShoulderX = anchorCoordinate(anchors, "right_shoulder", "x_norm"),
        let rightShoulderY = anchorCoordinate(anchors, "right_shoulder", "y_norm"),
        let leftHipX = anchorCoordinate(anchors, "left_hip", "x_norm"),
        let leftHipY = anchorCoordinate(anchors, "left_hip", "y_norm"),
        let rightHipX = anchorCoordinate(anchors, "right_hip", "x_norm"),
        let rightHipY = anchorCoordinate(anchors, "right_hip", "y_norm")
    else { return false }
    let shoulderDirection = rightShoulderX - leftShoulderX
    let hipDirection = rightHipX - leftHipX
    let shoulderSpan = abs(shoulderDirection)
    let hipSpan = abs(hipDirection)
    let shoulderY = (leftShoulderY + rightShoulderY) * 0.5
    let hipY = (leftHipY + rightHipY) * 0.5
    let shoulderCenter = (leftShoulderX + rightShoulderX) * 0.5
    let hipCenter = (leftHipX + rightHipX) * 0.5
    return shoulderSpan >= 0.04
        && hipSpan >= 0.04
        && hipY - shoulderY >= 0.08
        && shoulderDirection * hipDirection > 0.0
        && abs(rightShoulderY - leftShoulderY) <= 0.12
        && abs(rightHipY - leftHipY) <= 0.12
        && abs(hipCenter - shoulderCenter) <= 0.20
}

do {
    let arguments = try Arguments()
    let fileManager = FileManager.default
    let imageContext = CIContext(options: [.cacheIntermediates: false])
    let inputPath = arguments.inputDirectory.standardizedFileURL.path
    var images: [ImageInput] = []
    if let inputList = arguments.inputList {
        let text = try String(contentsOf: inputList, encoding: .utf8)
        for (lineNumber, line) in text.split(whereSeparator: \ .isNewline).enumerated() {
            guard let data = String(line).data(using: .utf8),
                  let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let scanID = object["scan_id"] as? String,
                  let relativePath = object["image"] as? String else {
                throw NSError(domain: "PrimeStyleApplePose", code: 4, userInfo: [NSLocalizedDescriptionKey: "Invalid input-list record on line \(lineNumber + 1)"])
            }
            images.append(ImageInput(
                scanID: scanID,
                imageURL: arguments.inputDirectory.appendingPathComponent(relativePath).standardizedFileURL,
                relativePath: relativePath
            ))
        }
    } else {
        guard let enumerator = fileManager.enumerator(
            at: arguments.inputDirectory,
            includingPropertiesForKeys: [.isRegularFileKey],
            options: [.skipsHiddenFiles]
        ) else {
            throw NSError(domain: "PrimeStyleApplePose", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot read input directory"])
        }
        var byScanID: [String: ImageInput] = [:]
        for case let fileURL as URL in enumerator {
            let standardized = fileURL.standardizedFileURL
            if standardized.pathComponents.contains("images") && standardized.lastPathComponent.hasSuffix(arguments.suffix) {
                let relativePath = standardized.path.hasPrefix(inputPath + "/")
                    ? String(standardized.path.dropFirst(inputPath.count + 1))
                    : standardized.lastPathComponent
                let scanID = scanID(from: standardized.lastPathComponent, suffix: arguments.suffix)
                let candidate = ImageInput(scanID: scanID, imageURL: standardized, relativePath: relativePath)
                if byScanID[scanID] == nil || relativePath < byScanID[scanID]!.relativePath {
                    byScanID[scanID] = candidate
                }
            }
        }
        images = Array(byScanID.values)
    }
    images.sort { $0.scanID < $1.scanID }
    if let limit = arguments.limit, images.count > limit {
        images = Array(images.prefix(limit))
    }

    try fileManager.createDirectory(
        at: arguments.outputURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
    if !fileManager.fileExists(atPath: arguments.outputURL.path) {
        fileManager.createFile(atPath: arguments.outputURL.path, contents: nil)
    }
    var completed = existingScanIDs(at: arguments.outputURL)
    let handle = try FileHandle(forWritingTo: arguments.outputURL)
    try handle.seekToEnd()
    defer { try? handle.close() }

    var processed = 0
    var passed = 0
    var failed = 0
    var skipped = 0
    for (position, input) in images.enumerated() {
        if completed.contains(input.scanID) {
            skipped += 1
            continue
        }

        let record: [String: Any] = autoreleasepool {
            do {
                guard let sourceImage = CIImage(contentsOf: input.imageURL) else {
                    throw NSError(domain: "PrimeStyleApplePose", code: 5, userInfo: [NSLocalizedDescriptionKey: "Cannot decode RGB teacher"])
                }
                let largestDimension = max(sourceImage.extent.width, sourceImage.extent.height)
                var observation: VNHumanBodyPose3DObservation?
                var inputScale = 1.0
                var inputRenderer = "core-image-lanczos"
                var lastError: Error = NSError(domain: "PrimeStyleApplePose", code: 3, userInfo: [NSLocalizedDescriptionKey: "No 3D body pose detected"])
                for targetDimension in [1024.0, 2048.0, 3072.0] {
                    inputScale = max(1.0, targetDimension / largestDimension)
                    let visionImage = sourceImage.applyingFilter(
                        "CILanczosScaleTransform",
                        parameters: [
                            kCIInputScaleKey: inputScale,
                            kCIInputAspectRatioKey: 1.0,
                        ]
                    )
                    guard let rasterImage = imageContext.createCGImage(visionImage, from: visionImage.extent) else {
                        throw NSError(domain: "PrimeStyleApplePose", code: 6, userInfo: [NSLocalizedDescriptionKey: "Cannot rasterize RGB teacher for Apple Vision"])
                    }
                    let request = VNDetectHumanBodyPose3DRequest()
                    let handler = VNImageRequestHandler(cgImage: rasterImage, options: [:])
                    do {
                        try handler.perform([request])
                        if let result = request.results?.first {
                            observation = result
                            break
                        }
                    } catch {
                        lastError = error
                    }
                }
                if observation == nil {
                    for targetDimension in [3072.0, 4096.0] {
                        inputScale = max(1.0, targetDimension / largestDimension)
                        let targetWidth = max(1, Int((sourceImage.extent.width * inputScale).rounded()))
                        let targetHeight = max(1, Int((sourceImage.extent.height * inputScale).rounded()))
                        let temporaryURL = fileManager.temporaryDirectory
                            .appendingPathComponent("wear-apple-pose-\(UUID().uuidString).png")
                        let process = Process()
                        process.executableURL = URL(fileURLWithPath: "/usr/bin/sips")
                        process.arguments = [
                            "-z", String(targetHeight), String(targetWidth),
                            input.imageURL.path,
                            "--out", temporaryURL.path,
                        ]
                        process.standardOutput = FileHandle.nullDevice
                        process.standardError = FileHandle.nullDevice
                        do {
                            try process.run()
                            process.waitUntilExit()
                            if process.terminationStatus == 0 {
                                let request = VNDetectHumanBodyPose3DRequest()
                                let handler = VNImageRequestHandler(url: temporaryURL, options: [:])
                                try handler.perform([request])
                                if let result = request.results?.first {
                                    observation = result
                                    inputRenderer = "sips-png-lanczos-fallback"
                                    try? fileManager.removeItem(at: temporaryURL)
                                    break
                                }
                            }
                        } catch {
                            lastError = error
                        }
                        try? fileManager.removeItem(at: temporaryURL)
                    }
                }
                var anchors: [String: Any] = [:]
                var bodyHeight: Float?
                var heightEstimation: Int?
                var poseMethod = "apple-vision-3d-projected-joints"
                if let observation {
                    for required in requiredJoints {
                        _ = try observation.recognizedPoint(required.name)
                        let imagePoint = try observation.pointInImage(required.name)
                        anchors[required.key] = [
                            "x_norm": imagePoint.x,
                            "y_norm": 1.0 - imagePoint.y,
                            "vision_y_bottom_origin": imagePoint.y,
                        ]
                    }
                    bodyHeight = observation.bodyHeight
                    heightEstimation = observation.heightEstimation.rawValue
                    if !anchorGeometryIsValid(anchors) {
                        anchors.removeAll(keepingCapacity: true)
                        bodyHeight = nil
                        heightEstimation = nil
                    }
                }
                if anchors.isEmpty {
                    // Apple's 3D request occasionally rejects a valid, very
                    // low-resolution silhouette. Use Apple's 2D body request
                    // for the same four visible joints before failing. This is
                    // still a direct Apple measurement on the exact teacher;
                    // it is not a WEAR-landmark conversion or a guessed rule.
                    for targetDimension in [1024.0, 2048.0, 3072.0, 4096.0] {
                        inputScale = max(1.0, targetDimension / largestDimension)
                        let visionImage = sourceImage.applyingFilter(
                            "CILanczosScaleTransform",
                            parameters: [
                                kCIInputScaleKey: inputScale,
                                kCIInputAspectRatioKey: 1.0,
                            ]
                        )
                        guard let rasterImage = imageContext.createCGImage(visionImage, from: visionImage.extent) else {
                            continue
                        }
                        let request = VNDetectHumanBodyPoseRequest()
                        let handler = VNImageRequestHandler(cgImage: rasterImage, options: [:])
                        do {
                            try handler.perform([request])
                            guard let result = request.results?.first else { continue }
                            var candidate: [String: Any] = [:]
                            var minimumConfidence: Float = 1.0
                            for required in required2DJoints {
                                let point = try result.recognizedPoint(required.name)
                                minimumConfidence = min(minimumConfidence, point.confidence)
                                candidate[required.key] = [
                                    "x_norm": point.location.x,
                                    "y_norm": 1.0 - point.location.y,
                                    "vision_y_bottom_origin": point.location.y,
                                    "confidence": point.confidence,
                                ]
                            }
                            if candidate.count == required2DJoints.count
                                && minimumConfidence >= 0.10
                                && anchorGeometryIsValid(candidate) {
                                anchors = candidate
                                inputRenderer = "core-image-lanczos-2d-pose-fallback"
                                poseMethod = "apple-vision-2d-joints-fallback"
                                break
                            }
                        } catch {
                            lastError = error
                        }
                    }
                }
                guard anchors.count == requiredJoints.count else { throw lastError }
                passed += 1
                var acceptedRecord: [String: Any] = [
                    "schema_version": 1,
                    "scan_id": input.scanID,
                    "view_id": "front-50",
                    "image": input.relativePath,
                    "accepted": true,
                    "pose_method": poseMethod,
                    "vision_input_scale": inputScale,
                    "vision_input_renderer": inputRenderer,
                    "anchors": anchors,
                ]
                if let bodyHeight {
                    acceptedRecord["body_height_m"] = bodyHeight
                }
                if let heightEstimation {
                    acceptedRecord["height_estimation"] = heightEstimation
                }
                return acceptedRecord
            } catch {
                failed += 1
                return [
                    "schema_version": 1,
                    "scan_id": input.scanID,
                    "view_id": "front-50",
                    "image": input.relativePath,
                    "accepted": false,
                    "error": error.localizedDescription,
                ]
            }
        }
        try handle.write(contentsOf: jsonLine(record))
        if record["accepted"] as? Bool == true {
            completed.insert(input.scanID)
        }
        processed += 1
        if processed % 25 == 0 || position + 1 == images.count {
            FileHandle.standardError.write(Data(
                "apple-pose \(position + 1)/\(images.count) passed=\(passed) failed=\(failed) resumed=\(skipped)\n".utf8
            ))
            try handle.synchronize()
        }
        if let maxNew = arguments.maxNew, processed >= maxNew {
            break
        }
    }
    print("{\"images\":\(images.count),\"processed\":\(processed),\"passed\":\(passed),\"failed\":\(failed),\"resumed\":\(skipped)}")
} catch is UsageError {
    FileHandle.standardError.write(Data(
        "Usage: apple_vision_pose_batch.swift --input-dir DIR [--input-list inputs.jsonl] --output anchors.jsonl [--suffix -front-50.png] [--limit N] [--max-new N]\n".utf8
    ))
    exit(2)
} catch {
    FileHandle.standardError.write(Data("Apple Vision batch failed: \(error)\n".utf8))
    exit(1)
}
