import subprocess
import sys
import os
from multiprocessing import Process

def run_django():
    """Run Django development server"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'spotify_clone.settings')
    subprocess.run([sys.executable, 'manage.py', 'runserver', '8000'])

def run_flask():
    """Run Flask development server"""
    subprocess.run([sys.executable, 'chatbot_api.py'])

if __name__ == '__main__':
    # Create processes for both servers
    django_process = Process(target=run_django)
    flask_process = Process(target=run_flask)

    try:
        # Start both servers
        print("Starting Django server on http://localhost:8000")
        django_process.start()
        
        print("Starting Flask server on http://localhost:5000")
        flask_process.start()

        # Wait for both processes to complete
        django_process.join()
        flask_process.join()

    except KeyboardInterrupt:
        print("\nShutting down servers...")
        django_process.terminate()
        flask_process.terminate()
        django_process.join()
        flask_process.join()
        print("Servers stopped.") 