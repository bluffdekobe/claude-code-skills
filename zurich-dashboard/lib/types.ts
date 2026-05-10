export interface Business {
  placeId: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  hasWebsite: boolean;
  lovablePrompt: string;
}

export type PipelineEvent =
  | { type: "status"; message: string }
  | { type: "business"; data: Business }
  | { type: "done"; total: number }
  | { type: "error"; message: string };
