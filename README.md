# Ballistic AI 🚀

Ballistic supercharges the latest SOTA LLMs like Claude 3.5, transforming chats into software development sessions. Put away the editor - work in broad strokes and go Ballistic.

https://github.com/user-attachments/assets/7d506aa6-3919-4989-be5a-859bd9187e9f

Your software project is automatically added into the chat context. Write/Execute/Diff/Undo operations allow you to work with LLM outputs with confidence and ease. The results will blow you away.

## Getting Started

1. Clone the repository:
   ```
   git clone https://github.com/djgish485/ballistic-ai.git
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
   - [Get Claude API key](https://www.anthropic.com/api)
   - [Get OpenAI API key](https://platform.openai.com/account/api-keys)

## Tips

- **API Selection**:
  - Claude 3.5 (Recommended): Ideal for complex tasks with 8192 token output.
  - GPT-4o: Faster with higher rate limits, suitable for simpler tasks.
- **Diff button**
  - Diff compares the AI output to existing files.
  - Use it liberally to catch hallucinations and file truncations.
- **Edit buttons** 
  - Not satisfied with the AI response? Hovering over your message shows a pencil icon to edit and provide clarification.
  - To make changes to a the code returned by AI, hover over it to show the edit icon on top.
- **Image button**
  - Send images and screenshots along with your message to help describe your issue (Claude only). 
- **Tips link**
  - Click "Tips >" underneath the input box to see helpful prompts to help debug and problem solve.
- **Context Validation**: 
  - Review `project-content.txt` to ensure critical files are included in the AI context.
  - For large projects, manage context size by editing context settings to only include relevant paths.  
- **Manage**: Keep chats manageable by clicking "Next Modification" or refreshing the page when you're confident a modification is finished.

## A New Paradigm

- Ballistic was created entirely via prompting. The .modification-prompts directory contains a log of the prompts used to create Ballistic. 

## License

[MIT](https://choosealicense.com/licenses/mit/)

---

Embrace the future of software development with Ballistic – where AI and human creativity converge.
