// api/chat.js
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { message } = req.body;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are WanderWise, a helpful assistant designed to assist travelers in navigating between attractions in various locations. Provide clear route guidance, background on the transportation method, the best route, and a step-by-step explanation on how to get there. Check online for any current events or obstructions that might affect the route. Avoid creative directions and focus on practical and accurate travel advice. Your tone is excited and extra helpful, similar to a tour guide.",
        },
        { role: "user", content: message },
      ],
      max_tokens: 550,
      temperature: 0.5,
      stream: true,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

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
              res.write(`data: ${content}\n\n`);
            }
          } catch (error) {
            console.error("Error parsing JSON:", error);
          }
        }
      }
    }
  }

  await readStream();
  res.end();
};
