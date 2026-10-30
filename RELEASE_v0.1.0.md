# DeepSeek Little Whale Maid ("dsh-whale-pet") v0.1.0

Initial release of DeepSeek Little Whale Maid (`dsh-whale-pet`), an interactive desktop pet and GalGame conversational stage plugin for DeepSeek Harness (DSH).

---

## Release Highlights

### 1. Dual Character Forms
- Maiden standing portrait with detailed maid dress, ribbons, and whale emblem apron.
- Chibi badge form for minimal footprint at the viewport corner.
- Quick switching via hover toolbar.

### 2. Independent Comic Thought Bubble (CoT)
- Reasoning output is rendered in an independent comic thought bubble beside the character's head.
- Supports smooth vertical scrolling to review the complete Chain-of-Thought reasoning history without blocking dialogue or illustrations.

### 3. Dynamic 4-Pose Thinking Rotation
- Automatically cycles between 4 expressive poses every 3.2 seconds during reasoning:
  1. Pondering (hand to chin)
  2. Cheeks Puffed (pouting concentration)
  3. Puzzled (confused cloud)
  4. Lightbulb Idea (inspiration)

### 4. Joyful Rice Eating Animation
- When the assistant begins streaming response content, the character automatically switches to the festive white rice eating illustration (`baifan2.png`).

### 5. GalGame Theatre Text Progression
- Center stage layout with a wide Visual Novel dialogue box.
- Sentences are comfortably paginated; click anywhere on the box to advance to the next paragraph.

### 6. Real-Time Dual Balance Display
- Directly queries DSH balance data and displays both Topped-up balance and Granted balance on the toolbar header.

### 7. Interactive Touch with Animation Protection
- Poking or clicking the character triggers a 2-second playful pouting reaction.
- Safeguard mechanism: smoothly returns to the ongoing thinking rotation or eating animation after 2 seconds without cancelling generation.

### 8. Self-Contained Deployment
- Automated `install.bat` and `uninstall.bat` scripts included.
- All graphics are Base64-inlined into `lib/client.js` to ensure zero asset loading errors.

---

## Installation

Download `dsh-whale-pet.zip` from Assets below, extract to any local folder, run `install.bat`, and refresh DeepSeek Harness (`Ctrl + R`).
