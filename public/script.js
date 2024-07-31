async function sendMessage() {
  const userInput = document.getElementById("user-input").value;
  if (!userInput) return;

  const chatBox = document.getElementById("chat-box");
  const userMessage = document.createElement("div");
  userMessage.className = "message user";
  userMessage.textContent = userInput;
  chatBox.appendChild(userMessage);

  document.getElementById("user-input").value = "";

  // Fetch request to the serverless function
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: userInput }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let botMessage = document.createElement("div");
  botMessage.className = "message bot";
  chatBox.appendChild(botMessage);

  // Function to read the stream
  async function readStream() {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const json = line.replace(/^data: /, "");
          if (json === "[DONE]") {
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices[0].delta.content;
            if (content) {
              botMessage.textContent += content;
              chatBox.scrollTop = chatBox.scrollHeight;
            }
          } catch (error) {
            console.error("Error parsing JSON:", error);
          }
        }
      }
    }
  }

  readStream();
}
