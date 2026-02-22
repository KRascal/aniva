import { fal } from "@fal-ai/client";

// Configure fal.ai with FAL_KEY from environment
fal.config({
  credentials: process.env.FAL_KEY,
});

interface ImageGenerationOptions {
  characterSlug: string;
  prompt: string;
  style?: 'selfie' | 'daily' | 'action' | 'moment';
  emotion?: string;
}

// キャラクター別のLoRAプロンプト設定
const CHARACTER_PROMPTS: Record<string, {
  basePrompt: string;
  negativePrompt: string;
  style: string;
}> = {
  luffy: {
    basePrompt: 'anime style, Monkey D Luffy from One Piece, straw hat, red vest, black hair, scar under left eye, cheerful expression',
    negativePrompt: 'realistic, photographic, deformed, ugly, bad anatomy, low quality',
    style: 'anime, manga style, high quality, detailed',
  },
};

const STYLE_PROMPTS: Record<string, string> = {
  selfie: 'selfie angle, close up face, looking at camera, smartphone camera perspective, casual pose',
  daily: 'daily life scene, relaxed pose, casual setting',
  action: 'dynamic pose, action scene, dramatic lighting',
  moment: 'special moment, emotional scene, beautiful lighting',
};

export class ImageEngine {
  
  /**
   * キャラクター画像を生成
   */
  async generateImage(options: ImageGenerationOptions): Promise<string | null> {
    const { characterSlug, prompt, style = 'selfie', emotion = 'happy' } = options;
    
    const charConfig = CHARACTER_PROMPTS[characterSlug];
    if (!charConfig) {
      console.error(`No character config for: ${characterSlug}`);
      return null;
    }
    
    const emotionPrompt = this.getEmotionPrompt(emotion);
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.selfie;
    
    const fullPrompt = [
      charConfig.style,
      charConfig.basePrompt,
      stylePrompt,
      emotionPrompt,
      prompt,
    ].filter(Boolean).join(', ');
    
    try {
      // Using Flux 1.1 Pro via fal.ai
      const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
        input: {
          prompt: fullPrompt,
          image_size: "square_hd",
        },
      });
      
      const imageUrl = result.data?.images?.[0]?.url;
      if (imageUrl) {
        return imageUrl;
      }
      
      return null;
    } catch (error) {
      console.error('Image generation error:', error);
      return null;
    }
  }
  
  /**
   * 感情に応じたプロンプト修飾
   */
  private getEmotionPrompt(emotion: string): string {
    const emotionMap: Record<string, string> = {
      neutral: 'calm expression, relaxed',
      happy: 'happy expression, bright smile, cheerful',
      excited: 'very excited expression, wide eyes, big grin, energetic',
      angry: 'angry expression, furrowed brows, intense eyes',
      sad: 'sad expression, downcast eyes, melancholic',
      hungry: 'drooling, excited about food, sparkling eyes',
      surprised: 'surprised expression, wide eyes, open mouth',
    };
    return emotionMap[emotion] || emotionMap.neutral;
  }
  
  /**
   * キャラの「自撮り」画像を生成
   */
  async generateSelfie(characterSlug: string, context?: string): Promise<string | null> {
    const contextPrompt = context || 'casual day, outdoors, sunny weather';
    return this.generateImage({
      characterSlug,
      prompt: contextPrompt,
      style: 'selfie',
      emotion: 'happy',
    });
  }
  
  /**
   * キャラの日常画像を生成（Moments用）
   */
  async generateDailyImage(characterSlug: string, scenario: string): Promise<string | null> {
    return this.generateImage({
      characterSlug,
      prompt: scenario,
      style: 'daily',
    });
  }
}

export const imageEngine = new ImageEngine();
