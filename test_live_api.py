import urllib.request
import urllib.parse
import uuid

API_URL = "https://skillgraph-api-cjc3dzazd5bvb5a7.centralindia-01.azurewebsites.net/api/analyze"

def main():
    boundary = uuid.uuid4().hex
    png_magic = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
    
    body = bytearray()
    
    # target_role
    body.extend(f'--{boundary}\r\n'.encode('utf-8'))
    body.extend(b'Content-Disposition: form-data; name="target_role"\r\n\r\n')
    body.extend(b'Software Engineer\r\n')
    
    # resume
    body.extend(f'--{boundary}\r\n'.encode('utf-8'))
    body.extend(b'Content-Disposition: form-data; name="resume"; filename="test_image.png"\r\n')
    body.extend(b'Content-Type: image/png\r\n\r\n')
    body.extend(png_magic)
    body.extend(b'\r\n')
    
    body.extend(f'--{boundary}--\r\n'.encode('utf-8'))
    
    req = urllib.request.Request(API_URL, data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    
    try:
        response = urllib.request.urlopen(req)
        print("Status:", response.status)
        print(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code)
        print(e.read().decode('utf-8'))

if __name__ == "__main__":
    main()
