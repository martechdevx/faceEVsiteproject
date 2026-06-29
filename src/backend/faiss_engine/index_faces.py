import os
import pickle
import faiss
import numpy as np

from face_engine import get_face_embedding

database_folder = "database"
embeddings_folder = "embeddings"

def build_index():
    embeddings = []
    image_paths = []
    
    print("Scanning database...")
    
    for filename in os.listdir(database_folder):
        file_path = os.path.join(database_folder, filename)
        
        if not filename.lower().endswith(
           (".jpg", ".jpeg", ".png")
        ):
            continue 
        
        embedding = get_face_embedding(file_path)
        if embedding is None:
            print(f"No face Found in {filename}")
            continue
        
        embeddings.append(embedding)
        image_paths.append(file_path)
        
        print(f"Indexed: {filename}")
        
    if not embeddings:
        print("No valid faces found.")
        return
        
    embeddings = np.array(embeddings).astype("float32")
    dimension = embeddings.shape[1]
            
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
            
    faiss.write_index (
        index, 
        os.path.join (
            embeddings_folder,
            "faces.index"
            )
    )
    with open(
     os.path.join(
         embeddings_folder,
         "metadata.pk1"
     ),
     "wb"
    )as f:
        pickle.dump(image_paths, f)
                
    print(f"\n Successfully indexed {len(image_paths)} faces!")
if __name__ == "__main__":
    build_index()
        
        