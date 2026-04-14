import glob

def process_html_files():
    html_files = glob.glob('*.html')
    
    for file in html_files:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()

        old_link = '<a href="https://test.cxjeeneet.com">Test Series</a>'
        new_link = '<a href="https://test.cxjeeneet.com">Online Test-Series</a>'
        
        if old_link in content:
            content = content.replace(old_link, new_link)
            
            with open(file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {file}")

if __name__ == "__main__":
    process_html_files()
