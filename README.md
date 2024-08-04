# Ballistic: A Radical New Method for Software Development 🚀

The latest SOTA LLMs are capable of reading & modifying your entire software project while outputting entire files. Ballistic transforms chats into software development sessions.

![Ballistic Overview](./public/screenshot1.png)

Write/Execute/Diff/Undo operations lets you work in confidence and ease. Find new creative levels and speed with Ballistic.

![AI Collaboration](./public/screenshot2.png)

## Getting Started

1. Clone the repository:
   ```
   git clone https://github.com/your-username/ballistic-nextjs.git
   cd ballistic-nextjs
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start Ballistic:
   ```
   npm run dev -- /path/to/your/project
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

5. Add your API keys in the Ballistic interface:
   - [Get Claude API key](https://www.anthropic.com/)
   - [Get OpenAI API key](https://platform.openai.com/account/api-keys)

## Quick Start Guide

1. **Initiate**: Click 'Start' to begin. Ballistic automatically creates a project backup and adds crucial files to the AI context.
2. **Enhance**: Add extra context by uploading additional files (e.g., requirements docs).
3. **Interact**: Engage with the AI to analyze, modify, or generate code. Expect and request full file outputs.
4. **Execute**: Use the Execute/Write/Diff/Undo buttons to manage code changes directly from the chat.
5. **Iterate**: Click "Next Feature" or reload the page to manage chat history.

## Tips

- **API Selection**:
  - Claude 3.5 (Recommended): Ideal for complex tasks with 8192 token output.
  - GPT-4o: Faster with higher rate limits, suitable for simpler tasks.
- **Context Validation**: 
  - Review `project-content.txt` to ensure critical files are included in the AI context.
  - For large projects, manage context size by editing context settings to only include relevant paths.  
- **Debugging**: Prompt the AI with: "List a couple hypotheses why [issue] is occurring and add log messages to investigate."

## License

[MIT](https://choosealicense.com/licenses/mit/)

---

Embrace the future of software development with Ballistic – where AI and human creativity converge.