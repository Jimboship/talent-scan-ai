export type ResumeRow = {
  id: string;
  user_id: string;
  file_name: string;
  extracted_text: string | null;
  embedding: number[] | null;
  created_at: string;
};
