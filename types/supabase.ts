export type ResumeRow = {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string | null;
  extracted_text: string | null;
  embedding: number[] | string | null;
  created_at: string;
};

