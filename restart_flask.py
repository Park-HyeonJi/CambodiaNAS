# -*- coding: utf-8 -*-
"""
Created on Thu Jul 11 05:32:41 2024

@author: Uchang Park
"""

import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class ChangeHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path.endswith("app.py"):
            os.system("pkill -f flask")
            os.system("flask run &")

if __name__ == "__main__":
    event_handler = ChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, path='.', recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
