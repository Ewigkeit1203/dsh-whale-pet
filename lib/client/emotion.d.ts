/**
 * Expressions for lines of dialogue (v0.6.0).
 *
 * Visual novels change the sprite's expression line by line. The theatre does
 * the same for the page being read: a small keyword score (Chinese and
 * English) picks one of the expression artworks and a mood mark drawn above
 * her head. Code is ignored, and anything unclear stays neutral so the normal
 * state poses (thinking, answering, rice) keep showing.
 */
export type Emotion = 'neutral' | 'happy' | 'proud' | 'smug' | 'shy' | 'surprised' | 'frustrated';
export type Emote = 'heart' | 'sparkle' | 'note' | 'sweat' | 'exclaim' | 'question' | 'anger' | null;
export declare function detectEmotion(text: string): Emotion;
/** Artwork for each expression (see poses.ts). */
export declare const EMOTION_POSE: Record<Exclude<Emotion, 'neutral'>, string>;
/** Mood mark above her head; a surprise phrased as a question gets “?”. */
export declare function emoteFor(emotion: Emotion, text?: string): Emote;
//# sourceMappingURL=emotion.d.ts.map