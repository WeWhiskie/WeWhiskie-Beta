const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
const API_BASE_URL = 'https://api-inference.huggingface.co/models';
const DEFAULT_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

interface HuggingFaceResponse {
  generated_text: string;
}

export class HuggingFaceClient {
  private apiKey: string;
  private cache: Map<string, { response: string; timestamp: number }>;

  constructor() {
    // Make sure the API key exists, throw error if not
    const apiKey = process.env.HUGGING_FACE_API_KEY;
    if (!apiKey) {
      throw new Error('HUGGING_FACE_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
    this.cache = new Map();
  }

  private getCacheKey(prompt: string, model: string): string {
    return `${model}:${prompt}`;
  }

  private async getFromCache(key: string): Promise<string | null> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.response;
    }
    return null;
  }

  private setCache(key: string, response: string): void {
    this.cache.set(key, { response, timestamp: Date.now() });
  }

  async generateResponse(prompt: string, model: string = DEFAULT_MODEL): Promise<string> {
    try {
      const cacheKey = this.getCacheKey(prompt, model);
      const cachedResponse = await this.getFromCache(cacheKey);

      if (cachedResponse) {
        return cachedResponse;
      }

      const response = await fetch(`${API_BASE_URL}/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.statusText}`);
      }

      const result = await response.json() as HuggingFaceResponse[];
      const generatedText = result[0].generated_text;

      this.setCache(cacheKey, generatedText);
      return generatedText;
    } catch (error) {
      console.error('Error generating response:', error);
      return this.getFallbackResponse();
    }
  }

  private getFallbackResponse(): string {
    const fallbackResponses = [
      "I'm currently experiencing a brief pause in my thinking. While I gather my thoughts, would you like to explore our curated whisky collection?",
      "Let me take a moment to consider that. In the meantime, shall we discuss different whisky regions or styles?",
      "I need a moment to process that. While I do, would you be interested in learning about our latest whisky recommendations?",
    ];
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }
}

export const huggingFaceClient = new HuggingFaceClient();