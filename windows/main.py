from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from PySide6.QtCore import Qt, QSettings, QUrl
from PySide6.QtGui import QDesktopServices, QFont
from PySide6.QtWidgets import (
    QApplication, QCheckBox, QFileDialog, QFrame, QHBoxLayout, QLabel,
    QLineEdit, QListWidget, QListWidgetItem, QMainWindow, QMessageBox,
    QPushButton, QStackedWidget, QVBoxLayout, QWidget
)

APP_NAME = "AEmulator Plus for Windows"
ORG_NAME = "JereyBeni"
SUPPORTED_SUFFIXES = {
    ".iso", ".zip", ".tar", ".md5", ".tgz", ".gz", ".img", ".br",
    ".sbf", ".pac", ".nbh", ".exe", ".7z", ".rar"
}
PROJECT_LINKS = [
    ("AEmulator Plus (original fork)", "https://github.com/somerandomusernam2/AEmulator-Plus"),
    ("AEmulator Sunset", "https://github.com/drel4/AEmulator-Sunset"),
    ("Original AEmulator", "https://github.com/uxazu/AEmulator"),
]


def app_data_file() -> Path:
    base = Path(os.environ.get("APPDATA", Path.home())) / "AEmulatorPlusWindows"
    base.mkdir(parents=True, exist_ok=True)
    return base / "firmware.json"


class Card(QFrame):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("Card")


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.settings = QSettings(ORG_NAME, "AEmulatorPlusWindows")
        self.firmware: list[str] = []
        self.load_firmware()
        self.setWindowTitle(APP_NAME)
        self.resize(1100, 720)
        self.setMinimumSize(820, 560)
        self.build_ui()
        self.apply_style()
        self.refresh_firmware()

    def build_ui(self):
        root = QWidget()
        outer = QHBoxLayout(root)
        outer.setContentsMargins(18, 18, 18, 18)
        outer.setSpacing(18)

        nav = Card()
        nav.setFixedWidth(220)
        nav_layout = QVBoxLayout(nav)
        nav_layout.setContentsMargins(16, 20, 16, 16)
        brand = QLabel("AEmulator Plus")
        brand.setObjectName("Brand")
        nav_layout.addWidget(brand)
        subtitle = QLabel("WINDOWS EDITION")
        subtitle.setObjectName("Eyebrow")
        nav_layout.addWidget(subtitle)
        nav_layout.addSpacing(28)

        self.pages = QStackedWidget()
        self.nav_buttons = []
        for label, index in (("Firmware library", 0), ("Settings", 1), ("About", 2)):
            button = QPushButton(label)
            button.setObjectName("NavButton")
            button.setCheckable(True)
            button.clicked.connect(lambda checked=False, i=index: self.show_page(i))
            nav_layout.addWidget(button)
            self.nav_buttons.append(button)
        nav_layout.addStretch()
        footer = QLabel("Material-inspired desktop UI")
        footer.setObjectName("Muted")
        footer.setWordWrap(True)
        nav_layout.addWidget(footer)

        self.pages.addWidget(self.build_library_page())
        self.pages.addWidget(self.build_settings_page())
        self.pages.addWidget(self.build_about_page())
        outer.addWidget(nav)
        outer.addWidget(self.pages, 1)
        self.setCentralWidget(root)
        self.show_page(0)

    def heading(self, title: str, subtitle: str) -> QVBoxLayout:
        layout = QVBoxLayout()
        title_label = QLabel(title)
        title_label.setObjectName("PageTitle")
        desc = QLabel(subtitle)
        desc.setObjectName("Muted")
        desc.setWordWrap(True)
        layout.addWidget(title_label)
        layout.addWidget(desc)
        return layout

    def build_library_page(self):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(12, 8, 8, 8)
        layout.setSpacing(16)
        layout.addLayout(self.heading("Firmware library", "Import Android firmware files and keep your collection in one place."))
        toolbar = QHBoxLayout()
        self.add_button = QPushButton("+  Add firmware")
        self.add_button.setObjectName("PrimaryButton")
        self.add_button.clicked.connect(self.add_firmware)
        self.remove_button = QPushButton("Remove")
        self.remove_button.clicked.connect(self.remove_selected)
        self.start_button = QPushButton("Start emulator")
        self.start_button.setObjectName("PrimaryButton")
        self.start_button.clicked.connect(self.start_selected)
        toolbar.addWidget(self.add_button)
        toolbar.addStretch()
        toolbar.addWidget(self.remove_button)
        toolbar.addWidget(self.start_button)
        layout.addLayout(toolbar)

        card = Card()
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(16, 16, 16, 16)
        card_title = QLabel("Imported firmware")
        card_title.setObjectName("SectionTitle")
        card_layout.addWidget(card_title)
        self.firmware_list = QListWidget()
        self.firmware_list.itemSelectionChanged.connect(self.update_actions)
        self.firmware_list.itemDoubleClicked.connect(lambda _: self.start_selected())
        card_layout.addWidget(self.firmware_list, 1)
        self.empty_label = QLabel("No firmware imported yet. Select “Add firmware” to choose a file.")
        self.empty_label.setObjectName("Muted")
        self.empty_label.setAlignment(Qt.AlignCenter)
        card_layout.addWidget(self.empty_label)
        layout.addWidget(card, 1)

        note = QLabel("Initial Windows backend: Android-x86 ISO boot through QEMU. Other firmware formats can be catalogued, but need the ARM guest-engine port before they can boot.")
        note.setObjectName("Info")
        note.setWordWrap(True)
        layout.addWidget(note)
        return page

    def build_settings_page(self):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(12, 8, 8, 8)
        layout.setSpacing(16)
        layout.addLayout(self.heading("Settings", "Configure default guest options and the QEMU executable."))

        options = Card()
        options_layout = QVBoxLayout(options)
        options_layout.setContentsMargins(18, 18, 18, 18)
        title = QLabel("Default emulator options")
        title.setObjectName("SectionTitle")
        options_layout.addWidget(title)

        self.jit_check = QCheckBox("Enable Dalvik JIT")
        self.jit_check.setChecked(self.settings.value("dalvik_jit", True, type=bool))
        self.gpu_check = QCheckBox("Enable phone GPU acceleration")
        self.gpu_check.setChecked(self.settings.value("phone_gpu", True, type=bool))
        options_layout.addWidget(self.jit_check)
        options_layout.addWidget(self.gpu_check)
        hint = QLabel("Both options are enabled by default. They are saved as guest preferences; full application to imported ARM firmware requires the Windows guest-engine port.")
        hint.setObjectName("Muted")
        hint.setWordWrap(True)
        options_layout.addWidget(hint)
        layout.addWidget(options)

        qemu = Card()
        qemu_layout = QVBoxLayout(qemu)
        qemu_layout.setContentsMargins(18, 18, 18, 18)
        qemu_title = QLabel("QEMU")
        qemu_title.setObjectName("SectionTitle")
        qemu_layout.addWidget(qemu_title)
        row = QHBoxLayout()
        self.qemu_path = QLineEdit(self.settings.value("qemu_path", shutil.which("qemu-system-x86_64") or "qemu-system-x86_64.exe"))
        self.qemu_path.setPlaceholderText("Path to qemu-system-x86_64.exe")
        browse = QPushButton("Browse")
        browse.clicked.connect(self.browse_qemu)
        row.addWidget(self.qemu_path, 1)
        row.addWidget(browse)
        qemu_layout.addLayout(row)
        layout.addWidget(qemu)

        save = QPushButton("Save settings")
        save.setObjectName("PrimaryButton")
        save.clicked.connect(self.save_settings)
        layout.addWidget(save, 0, Qt.AlignLeft)
        layout.addStretch()
        return page

    def build_about_page(self):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(12, 8, 8, 8)
        layout.setSpacing(16)
        layout.addLayout(self.heading("About AEmulator Plus", "An independent Windows desktop frontend project inspired by the AEmulator family."))
        card = Card()
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(18, 18, 18, 18)
        title = QLabel("Related projects")
        title.setObjectName("SectionTitle")
        card_layout.addWidget(title)
        for label, url in PROJECT_LINKS:
            link = QPushButton(label + "  ↗")
            link.setObjectName("LinkButton")
            link.clicked.connect(lambda checked=False, target=url: self.open_link(target))
            card_layout.addWidget(link, 0, Qt.AlignLeft)
        layout.addWidget(card)
        disclaimer = QLabel("This Windows frontend is a separate desktop implementation. It does not bundle the Android APK or claim that the Android-only guest engine already runs on Windows. Firmware files are supplied by the user.")
        disclaimer.setObjectName("Muted")
        disclaimer.setWordWrap(True)
        layout.addWidget(disclaimer)
        layout.addStretch()
        return page

    def show_page(self, index: int):
        self.pages.setCurrentIndex(index)
        for i, button in enumerate(self.nav_buttons):
            button.setChecked(i == index)

    def load_firmware(self):
        try:
            self.firmware = json.loads(app_data_file().read_text(encoding="utf-8"))
            if not isinstance(self.firmware, list):
                self.firmware = []
        except (OSError, ValueError):
            self.firmware = []

    def save_firmware(self):
        app_data_file().write_text(json.dumps(self.firmware, indent=2), encoding="utf-8")

    def refresh_firmware(self):
        self.firmware_list.clear()
        for path in self.firmware:
            p = Path(path)
            item = QListWidgetItem(f"{p.name}\n{p}")
            item.setData(Qt.UserRole, path)
            item.setToolTip(path)
            self.firmware_list.addItem(item)
        self.empty_label.setVisible(not self.firmware)
        self.update_actions()

    def update_actions(self):
        selected = self.firmware_list.currentItem() is not None
        self.remove_button.setEnabled(selected)
        self.start_button.setEnabled(selected)

    def add_firmware(self):
        files, _ = QFileDialog.getOpenFileNames(
            self, "Add Android firmware", "",
            "Firmware files (*.iso *.zip *.tar *.md5 *.tgz *.gz *.img *.br *.sbf *.pac *.nbh *.exe *.7z *.rar);;All files (*.*)"
        )
        changed = False
        for value in files:
            path = str(Path(value).resolve())
            if Path(path).suffix.lower() in SUPPORTED_SUFFIXES and path not in self.firmware:
                self.firmware.append(path)
                changed = True
        if changed:
            self.save_firmware()
            self.refresh_firmware()

    def remove_selected(self):
        item = self.firmware_list.currentItem()
        if item:
            path = item.data(Qt.UserRole)
            self.firmware = [p for p in self.firmware if p != path]
            self.save_firmware()
            self.refresh_firmware()

    def browse_qemu(self):
        path, _ = QFileDialog.getOpenFileName(self, "Select QEMU", "", "QEMU executable (qemu-system-x86_64.exe);;Applications (*.exe)")
        if path:
            self.qemu_path.setText(path)

    def save_settings(self):
        self.settings.setValue("dalvik_jit", self.jit_check.isChecked())
        self.settings.setValue("phone_gpu", self.gpu_check.isChecked())
        self.settings.setValue("qemu_path", self.qemu_path.text().strip())
        QMessageBox.information(self, "Settings saved", "Your settings have been saved.")

    def start_selected(self):
        item = self.firmware_list.currentItem()
        if not item:
            return
        path = Path(item.data(Qt.UserRole))
        if not path.exists():
            QMessageBox.warning(self, "Firmware missing", "The selected file no longer exists. Remove it and import it again.")
            return
        if path.suffix.lower() != ".iso":
            QMessageBox.information(
                self, "Guest engine not available yet",
                "This firmware is in your library, but this initial Windows build only boots Android-x86 ISO files. The Android ARM firmware importer, patched QEMU engine, binder bridge and phone-GPU bridge still need a native Windows port."
            )
            return
        qemu = self.qemu_path.text().strip() or "qemu-system-x86_64.exe"
        executable = shutil.which(qemu) if not Path(qemu).exists() else qemu
        if not executable:
            QMessageBox.warning(self, "QEMU not found", "Install a Windows build of QEMU and select qemu-system-x86_64.exe in Settings.")
            return
        try:
            subprocess.Popen(
                [executable, "-name", "AEmulator Plus", "-m", "2048", "-smp", "2",
                 "-accel", "tcg", "-cdrom", str(path), "-boot", "d"]
            )
        except OSError as error:
            QMessageBox.critical(self, "Could not start QEMU", str(error))

    def open_link(self, url: str):
        QDesktopServices.openUrl(QUrl(url))

    def apply_style(self):
        self.setStyleSheet("""
            QMainWindow, QWidget { background: #f5f3fa; color: #1b1b22; font-size: 14px; }
            QFrame#Card { background: #ffffff; border: 1px solid #e7e2ee; border-radius: 20px; }
            QLabel#Brand { font-size: 21px; font-weight: 700; color: #332b48; }
            QLabel#Eyebrow { color: #716783; font-size: 10px; font-weight: 700; letter-spacing: 2px; }
            QLabel#PageTitle { font-size: 30px; font-weight: 700; color: #282333; }
            QLabel#SectionTitle { font-size: 17px; font-weight: 650; color: #302a3c; }
            QLabel#Muted { color: #716d7b; }
            QLabel#Info { color: #49415c; background: #eae4f7; padding: 13px 16px; border-radius: 14px; }
            QPushButton { background: #eeeaf5; color: #393247; border: 0; border-radius: 14px; padding: 11px 16px; }
            QPushButton:hover { background: #e4ddef; }
            QPushButton:disabled { color: #aaa5b2; background: #f0eef3; }
            QPushButton#PrimaryButton { background: #6750a4; color: white; font-weight: 650; padding: 12px 18px; }
            QPushButton#PrimaryButton:hover { background: #57418f; }
            QPushButton#NavButton { text-align: left; padding: 13px 14px; background: transparent; }
            QPushButton#NavButton:checked { background: #e8def8; color: #39265f; font-weight: 650; }
            QPushButton#LinkButton { text-align: left; color: #55408c; background: transparent; }
            QPushButton#LinkButton:hover { background: #eeeaf5; }
            QListWidget { background: transparent; border: 0; outline: 0; }
            QListWidget::item { background: #f7f5fa; border: 1px solid #ebe7f1; border-radius: 13px; padding: 13px; margin: 4px 0; }
            QListWidget::item:selected { background: #e8def8; color: #2f214d; border: 1px solid #b9a7dc; }
            QLineEdit { background: #f7f5fa; border: 1px solid #d9d2e3; border-radius: 12px; padding: 11px; }
            QCheckBox { spacing: 10px; padding: 8px 2px; }
        """)


def main():
    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    app.setOrganizationName(ORG_NAME)
    app.setFont(QFont("Segoe UI", 10))
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
