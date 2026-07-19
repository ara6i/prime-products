#!/usr/bin/env swift

import Foundation
import Vision
import simd

guard CommandLine.arguments.count >= 2 else {
    FileHandle.standardError.write(Data("Usage: apple_vision_pose3d_test.swift IMAGE\n".utf8))
    exit(2)
}

let imageURL = URL(fileURLWithPath: CommandLine.arguments[1])
let request = VNDetectHumanBodyPose3DRequest()
let handler = VNImageRequestHandler(url: imageURL, options: [:])

do {
    try handler.perform([request])
    guard let observation = request.results?.first else {
        throw NSError(domain: "PrimeStyleVision3D", code: 1, userInfo: [NSLocalizedDescriptionKey: "No 3D body pose detected"])
    }

    func array(_ matrix: simd_float4x4) -> [[Float]] {
        let columns = [matrix.columns.0, matrix.columns.1, matrix.columns.2, matrix.columns.3]
        return columns.map { [$0.x, $0.y, $0.z, $0.w] }
    }

    var joints: [[String: Any]] = []
    for name in observation.availableJointNames {
        let point = try observation.recognizedPoint(name)
        let imagePoint = try observation.pointInImage(name)
        let cameraRelative = try observation.cameraRelativePosition(name)
        joints.append([
            "name": name.rawValue,
            "position": array(point.position),
            "localPosition": array(point.localPosition),
            "cameraRelativePosition": array(cameraRelative),
            "imagePoint": ["x": imagePoint.x, "y": imagePoint.y],
        ])
    }

    let output: [String: Any] = [
        "bodyHeightM": observation.bodyHeight,
        "heightEstimation": observation.heightEstimation.rawValue,
        "cameraOriginMatrix": array(observation.cameraOriginMatrix),
        "joints": joints,
    ]
    let data = try JSONSerialization.data(withJSONObject: output, options: [.sortedKeys])
    print(String(decoding: data, as: UTF8.self))
} catch {
    FileHandle.standardError.write(Data("Apple Vision 3D failed: \(error)\n".utf8))
    exit(1)
}
