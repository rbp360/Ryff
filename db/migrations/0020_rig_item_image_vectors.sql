-- Migration 0020: Image embeddings for rig items (gemini-embedding-2, 768-dim multimodal space)
-- Images and text share one vector space under this model, enabling photo -> gear identification
-- and text -> look-alike search. Kept separate from rig_item_knowledge (gemini-embedding-001 space).

create table if not exists rig_item_image_vectors (
  rig_item_id bigint primary key references rig_items(id) on delete cascade,
  image_url text not null,
  image_embedding vector(768) not null,
  embedding_model text not null,
  embedded_at timestamptz not null default now()
);

create index if not exists rig_item_image_vectors_embedding_idx
  on rig_item_image_vectors using hnsw (image_embedding vector_cosine_ops);

