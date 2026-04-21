import os

middleware_path = 'src/middleware.ts'
if os.path.exists(middleware_path):
    try:
        os.remove(middleware_path)
        print(f"Successfully deleted {middleware_path}")
    except Exception as e:
        print(f"Error deleting {middleware_path}: {e}")
else:
    print(f"{middleware_path} not found")
