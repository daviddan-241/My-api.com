import Foundation
import UIKit

// ============================================================
// MyAI Gateway — iOS Swift Client
// ============================================================
// Replace baseURL and apiKey with your own values.
// Works with URLSession — no external dependencies needed.
// ============================================================

public struct AIGateway {
    
    // MARK: - Configuration
    public let baseURL: String
    public let apiKey: String
    
    public init(baseURL: String, apiKey: String) {
        self.baseURL = baseURL.hasSuffix("/") ? String(baseURL.dropLast()) : baseURL
        self.apiKey = apiKey
    }
    
    // MARK: - Text Generation
    
    /// Generate text from a prompt.
    /// - Parameters:
    ///   - prompt: What you want the AI to write or answer
    ///   - maxTokens: Max response length (default 512)
    ///   - model: Override the default model (optional)
    public func generateText(
        prompt: String,
        maxTokens: Int = 512,
        model: String? = nil
    ) async throws -> String {
        var body: [String: Any] = ["prompt": prompt, "max_tokens": maxTokens]
        if let model { body["model"] = model }
        let result = try await post(path: "/api/ai/text", body: body)
        return result["response"] as? String ?? ""
    }
    
    // MARK: - Chat
    
    /// Multi-turn chat. Messages follow OpenAI format: [["role": "user", "content": "Hello"]]
    /// Roles: "system", "user", "assistant"
    public func chat(
        messages: [[String: String]],
        maxTokens: Int = 512,
        model: String? = nil
    ) async throws -> String {
        var body: [String: Any] = ["messages": messages, "max_tokens": maxTokens]
        if let model { body["model"] = model }
        let result = try await post(path: "/api/ai/chat", body: body)
        return result["response"] as? String ?? ""
    }
    
    // MARK: - Code Generation
    
    /// Generate or complete code in any language.
    /// - Parameters:
    ///   - prompt: Describe what code to write
    ///   - language: e.g. "swift", "python", "javascript" (optional hint)
    public func generateCode(
        prompt: String,
        language: String? = nil,
        maxTokens: Int = 512,
        model: String? = nil
    ) async throws -> String {
        var body: [String: Any] = ["prompt": prompt, "max_tokens": maxTokens]
        if let language { body["language"] = language }
        if let model { body["model"] = model }
        let result = try await post(path: "/api/ai/code", body: body)
        return result["response"] as? String ?? ""
    }
    
    // MARK: - Image Generation
    
    /// Generate an image from a text prompt. Returns UIImage.
    /// Note: Image generation takes 10-30 seconds on the free tier.
    public func generateImage(
        prompt: String,
        negativePrompt: String? = nil,
        model: String? = nil
    ) async throws -> UIImage? {
        var body: [String: Any] = ["prompt": prompt]
        if let negativePrompt { body["negative_prompt"] = negativePrompt }
        if let model { body["model"] = model }
        let result = try await post(path: "/api/ai/image", body: body)
        guard let base64 = result["image_base64"] as? String,
              let data = Data(base64Encoded: base64) else { return nil }
        return UIImage(data: data)
    }
    
    // MARK: - Rules Management
    
    /// Get the current gateway rules (system prompt, blocked words, models, etc.)
    public func getRules() async throws -> [String: Any] {
        return try await get(path: "/api/ai/rules")
    }
    
    /// Update gateway rules. Only provided fields are changed.
    /// - Parameters:
    ///   - systemPrompt: The AI's personality/behavior instruction
    ///   - blockedWords: Phrases to reject
    ///   - defaultMaxTokens: Default response length
    public func updateRules(
        systemPrompt: String? = nil,
        blockedWords: [String]? = nil,
        defaultMaxTokens: Int? = nil,
        modelText: String? = nil,
        modelChat: String? = nil,
        modelCode: String? = nil,
        modelImage: String? = nil
    ) async throws -> [String: Any] {
        var body: [String: Any] = [:]
        if let v = systemPrompt { body["systemPrompt"] = v }
        if let v = blockedWords { body["blockedWords"] = v }
        if let v = defaultMaxTokens { body["defaultMaxTokens"] = v }
        if let v = modelText { body["modelText"] = v }
        if let v = modelChat { body["modelChat"] = v }
        if let v = modelCode { body["modelCode"] = v }
        if let v = modelImage { body["modelImage"] = v }
        return try await put(path: "/api/ai/rules", body: body)
    }
    
    // MARK: - Private helpers
    
    private func makeRequest(method: String, path: String) -> URLRequest {
        let url = URL(string: baseURL + path)!
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.timeoutInterval = 60
        return request
    }
    
    private func post(path: String, body: [String: Any]) async throws -> [String: Any] {
        var request = makeRequest(method: "POST", path: path)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        return try JSONSerialization.jsonObject(with: data) as! [String: Any]
    }
    
    private func get(path: String) async throws -> [String: Any] {
        let request = makeRequest(method: "GET", path: path)
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        return try JSONSerialization.jsonObject(with: data) as! [String: Any]
    }
    
    private func put(path: String, body: [String: Any]) async throws -> [String: Any] {
        var request = makeRequest(method: "PUT", path: path)
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response, data: data)
        return try JSONSerialization.jsonObject(with: data) as! [String: Any]
    }
    
    private func checkResponse(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
                ?? "HTTP \(http.statusCode)"
            throw AIGatewayError.apiError(msg)
        }
    }
}

// MARK: - Error type
public enum AIGatewayError: LocalizedError {
    case apiError(String)
    public var errorDescription: String? {
        if case .apiError(let msg) = self { return msg }
        return nil
    }
}


// ============================================================
// EXAMPLE USAGE IN SwiftUI
// ============================================================

/*
import SwiftUI

struct ContentView: View {
    @State private var response = ""
    @State private var isLoading = false
    
    let gateway = AIGateway(
        baseURL: "https://myai-gateway.onrender.com",  // your Render URL
        apiKey: "YOUR_API_KEY_HERE"
    )
    
    var body: some View {
        VStack(spacing: 20) {
            Text(response.isEmpty ? "Tap a button to try your AI" : response)
                .padding()
            
            if isLoading {
                ProgressView("Generating...")
            }
            
            Button("Ask a question") {
                Task {
                    isLoading = true
                    response = (try? await gateway.generateText(
                        prompt: "What is the meaning of life?",
                        maxTokens: 200
                    )) ?? "Error"
                    isLoading = false
                }
            }
            
            Button("Chat") {
                Task {
                    isLoading = true
                    response = (try? await gateway.chat(messages: [
                        ["role": "system", "content": "You are a helpful assistant."],
                        ["role": "user", "content": "Write me a joke."]
                    ])) ?? "Error"
                    isLoading = false
                }
            }
            
            Button("Generate Swift code") {
                Task {
                    isLoading = true
                    response = (try? await gateway.generateCode(
                        prompt: "Write a function to check if a string is a palindrome",
                        language: "swift"
                    )) ?? "Error"
                    isLoading = false
                }
            }
        }
        .padding()
    }
}
*/
