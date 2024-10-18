export interface OpenAIMessage {
  role: string;
  content?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIResponse {
  choices: Array<{
    message: OpenAIMessage;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface QueryInterface {
  name: string;
  price?: boolean;
}

export interface FunctionCallArguments {
  query?: QueryInterface;
  amount: number;
  fromCurrency: string;
  toCurrency: string;
}
