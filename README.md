# Ballistic AI 🚀

Ballistic supercharges the latest SOTA LLMs like Claude 3.5, transforming chats into software development sessions. Put away the editor - work in plain English and go Ballistic.

![Screenshot 2024-08-12 at 7 47 16 PM](https://github.com/user-attachments/assets/b5ffeb2e-5e37-4c35-a31c-1d68692df68c)


## Why Ballistic?
- With AI code editors you're still juggling files and figuring out how code fits together.
- With artifacts, you are copy & pasting code, unsure of what changes were made.
- In Ballistic your software project is directly tied into the chat. Code is auto-loaded into Claude's context. Buttons like Write/Execute/Diff/Undo allow you to work with LLM outputs w/ confidence and ease.

## Getting Started

1. Clone the repository:
   ```
   git clone https://github.com/djgish485/ballistic-ai.git
   cd ballistic-ai
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
   - [Get Claude API key](https://www.anthropic.com/api)
   - [Get OpenAI API key](https://platform.openai.com/account/api-keys)

## Tips

**API Selection**:
  - Claude 3.5 (Recommended): Ideal for complex tasks with 8192 token output.
  - GPT-4o: Faster with higher rate limits, suitable for simpler tasks.

**Diff button** compares the AI output to existing files. Use it liberally to catch hallucinations and truncations.

**Edit buttons** Hovering over your messages shows a pencil icon to edit. Hovering over code blocks shows an edit button on top.

**Tips button** contains helpful prompts for debugging and problem solving.

Manage context size in large projects by using Dynamic Context.

Keep chats manageable by clicking "Next Modification" or refreshing the page when you're confident a modification is finished.

## A New Paradigm

Ballistic was created entirely via prompting. The .modification-prompts directory contains a log of the prompts used to create Ballistic. 

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Contact

[Hit me up on X](https://x.com/djgish) and lemme know if you're going Ballistic.

