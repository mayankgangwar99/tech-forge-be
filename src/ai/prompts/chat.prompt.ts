export const buildChatConversationPrompt = (
  history: Array<{ role: "user" | "assistant"; message: string }>
): string => {
  const contextLines = history.map((item) => `${item.role.toUpperCase()}: ${item.message}`).join("\n");
  return [
    "You are a concise AI coaching assistant for interview preparation.",
    "Return STRICT JSON only.",
    "No markdown. No explanations. No extra text.",
    'Format: {"assistantMessage": "string"}',
    "",
    "Conversation:",
    contextLines,
  ].join("\n");
};
