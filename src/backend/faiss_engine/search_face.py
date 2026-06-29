import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
import sys
import os
import faiss
import pickle
import numpy as np
from PIL import Image
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QFileDialog, QTabWidget, QScrollArea, QGridLayout
)
from PyQt5.QtGui import QPixmap, QImage
from PyQt5.QtCore import Qt
from face_engine import get_face_embedding


index = faiss.read_index("embeddings/faces.index")
with open("embeddings/metadata.pk1", "rb") as f:
    names = pickle.load(f)

threshold = 0.6

def pil2pixmap(img):
    """Convert PIL image to QPixmap for display in QLabel."""
    rgb = img.convert("RGB")
    data = rgb.tobytes("raw", "RGB")
    qimg = QImage(data, rgb.size[0], rgb.size[1], QImage.Format_RGB888)
    return QPixmap.fromImage(qimg)

class FaceMatchApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Face Match — InsightFace & FAISS")
        self.resize(1200, 800)


         
        self.query_path = None

        # Tabs
        self.tabs = QTabWidget()
        self.setCentralWidget(self.tabs)

        # Query tab
        self.query_tab = QWidget()
        self.tabs.addTab(self.query_tab, "Select Query")

        main_layout = QHBoxLayout()
        self.query_tab.setLayout(main_layout)

        # Left panel
        left_panel = QVBoxLayout()
        self.query_label = QLabel("Query Image")
        self.query_label.setAlignment(Qt.AlignCenter)
        left_panel.addWidget(self.query_label)

        self.best_label = QLabel("Best Match")
        self.best_label.setAlignment(Qt.AlignCenter)
        left_panel.addWidget(self.best_label)

        # Buttons
        self.select_btn = QPushButton("Choose Query Image")
        self.select_btn.clicked.connect(self.load_query)
        left_panel.addWidget(self.select_btn)

        self.find_btn = QPushButton("Find Matches")
        self.find_btn.clicked.connect(self.find_matches)
        left_panel.addWidget(self.find_btn)

        main_layout.addLayout(left_panel, 1)

        # Right panel (grid of matches)
        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_content = QWidget()
        self.scroll_layout = QGridLayout(self.scroll_content)
        self.scroll_area.setWidget(self.scroll_content)
        main_layout.addWidget(self.scroll_area, 2)

    def load_query(self):
        query_path, _ = QFileDialog.getOpenFileName(
            self, "Select Query Image", "", "Images (*.jpg *.jpeg *.png)"
        )
        if not query_path:
            return

        self.query_path = query_path
        qimg = pil2pixmap(Image.open(query_path))
        self.query_label.setPixmap(qimg.scaled(300, 300, Qt.KeepAspectRatio))

        # Reset best match panel
        self.best_label.setText("Best Match will appear here")

    def find_matches(self):
        if not self.query_path:
            self.best_label.setText("No query image selected")
            return

        embedding = get_face_embedding(self.query_path)
        if embedding is None:
            self.best_label.setText("No face detected in query image")
            return

        query = np.array([embedding]).astype("float32")
        distances, indices = index.search(query, len(names))
        similarities = 1 / (1 + distances[0])

        best_idx = indices[0][0]
        best_similarity = similarities[0]
        best_path = names[best_idx]
        
        if best_similarity >= threshold and os.path.exists(best_path):
            best_img = pil2pixmap(Image.open(best_path))
            self.best_label.setPixmap(best_img.scaled(300, 300, Qt.KeepAspectRatio))
            self.best_label.setToolTip(f"Best Match\nSim={best_similarity:.3f}")
        else:
            self.best_label.setText("No match found")
            self.best_label.setToolTip("No match found in database")
        
        while self.scroll_layout.count():
            item = self.scroll_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        # Show matches in grid (3 columns)
        for i, idx in enumerate(indices[0]):
            path = names[idx]
            if not os.path.exists(path):
                continue

            img = pil2pixmap(Image.open(path))
            lbl = QLabel()
            lbl.setPixmap(img)
            lbl.setScaledContents(True)
            lbl.setFixedSize(200, 200)

            sim_label = QLabel(f"Sim={similarities[i]:.3f}")
            sim_label.setAlignment(Qt.AlignCenter)

            container = QWidget()
            vbox = QVBoxLayout(container)
            vbox.addWidget(lbl)
            vbox.addWidget(sim_label)

            if idx == best_idx:
                lbl.setStyleSheet("border: 3px solid red;")

            row = i // 3
            col = i % 3
            self.scroll_layout.addWidget(container, row, col)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = FaceMatchApp()
    window.show()
    sys.exit(app.exec_())

