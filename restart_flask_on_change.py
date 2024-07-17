# -*- coding: utf-8 -*-
"""
Created on Thu Jul 11 05:32:41 2024

@author: Uchang Park
"""
import os
import time
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class ChangeHandler(FileSystemEventHandler):
    def __init__(self, script):
        self.script = script
        self.process = None
        self.start_script()

    def start_script(self):
        if self.process:
            self.process.kill()
        self.process = subprocess.Popen(['python', self.script])

    def on_modified(self, event):
        if event.src_path.endswith('app.py'):
            print(f"{event.src_path} has been modified. Restarting the Flask app.")
            self.start_script()

if __name__ == "__main__":
    script_to_watch = 'app.py'
    event_handler = ChangeHandler(script_to_watch)
    observer = Observer()
    observer.schedule(event_handler, path='.', recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
