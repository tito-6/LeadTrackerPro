import { Ollama } from 'ollama';

interface OllamaConfig {
  model: string;
  baseUrl: string;
  temperature: number;
}

const DEFAULT_CONFIG: OllamaConfig = {
  model: 'llama3.2:3b-instruct-q4_0', // Lightweight model for better performance
  baseUrl: 'http://localhost:11434',
  temperature: 0.1, // Low temperature for more consistent SQL generation
};

class OllamaService {
  private ollama: Ollama;
  private config: OllamaConfig;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ollama = new Ollama({ host: this.config.baseUrl });
  }

  async ensureModelAvailable(): Promise<boolean> {
    try {
      const models = await this.ollama.list();
      const modelExists = models.models.some(m => m.name.includes(this.config.model.split(':')[0]));
      
      if (!modelExists) {
        console.log(`Pulling model: ${this.config.model}`);
        await this.ollama.pull({ model: this.config.model });
        console.log(`Model ${this.config.model} pulled successfully`);
      }
      
      return true;
    } catch (error) {
      console.error('Ollama service not available:', error);
      return false;
    }
  }

  async invoke(prompt: string, context?: string): Promise<string> {
    try {
      const fullPrompt = context ? `${context}\n\nUser Question: ${prompt}` : prompt;
      
      const response = await this.ollama.chat({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
        options: {
          temperature: this.config.temperature,
        },
      });
      
      return response.message.content;
    } catch (error) {
      console.error('Error invoking Ollama:', error);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  async generateSQL(query: string, schema: string): Promise<string> {
    const sqlPrompt = `
You are a SQL expert for a Turkish real estate lead tracking system. Generate precise PostgreSQL queries.

Database Schema:
${schema}

Key Turkish Terms:
- "satılık" or "satis" = sales leads
- "kiralık" or "kiralama" = rental leads  
- "Instagram", "Facebook", "Referans" = lead sources
- "personel" = sales personnel
- "durum" or "status" = lead status
- "tarih" = date
- "müşteri" = customer

Important Notes:
- Use exact column names from schema
- leadType values: 'satis' (sales), 'kiralama' (rental)
- Common statuses: 'yeni', 'arama_yapildi', 'randevu_alindi', 'satis_yapildi', 'olumsuz'
- Date columns: requestDate, lastUpdateDate
- Always include LIMIT for large datasets

User Query: ${query}

Generate only the SQL query without explanations:
`;

    return this.invoke(sqlPrompt);
  }

  async interpretResults(query: string, sqlResults: any[], originalQuestion: string): Promise<{
    summary: string;
    chartSpec?: any;
  }> {
    const interpretPrompt = `
You are analyzing real estate lead data. Provide a clear Turkish summary and suggest charts when appropriate.

Original Question: ${originalQuestion}
SQL Query: ${query}
Results: ${JSON.stringify(sqlResults, null, 2)}

Provide response in this JSON format:
{
  "summary": "Clear Turkish explanation of the results",
  "chartSpec": {
    "type": "pie" | "bar" | "line",
    "title": "Chart title in Turkish",
    "labels": ["label1", "label2"],
    "data": [value1, value2],
    "colors": ["#color1", "#color2"]
  }
}

Guidelines:
- Always respond in Turkish
- Include chartSpec only for data that benefits from visualization
- Use appropriate chart types: pie for distributions, bar for comparisons, line for trends
- Use brand colors: Instagram #9b51e0, Facebook #3498db, Referans #2ecc71
- Summarize key insights and trends

Response:
`;

    const response = await this.invoke(interpretPrompt);
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        summary: response,
        chartSpec: null
      };
    }
  }

  getOllama(): Ollama {
    return this.ollama;
  }
}

export const ollamaService = new OllamaService();
export { OllamaService, type OllamaConfig };