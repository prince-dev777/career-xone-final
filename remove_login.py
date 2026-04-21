import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html') and f not in ('admin.html', 'admin-login.html', 'login.html', 'register.html')]

mobile_login_pattern = re.compile(r'\s*<!-- Mobile Login Button \(Only visible on mobile\) -->\s*<div class="mobile-login-wrapper">\s*<a href="login\.html" id="mobileAuthBtn" class="login-btn mobile-login-btn"><i class="fas fa-sign-in-alt"></i> Login</a>\s*</div>', re.DOTALL)

desktop_login_pattern = re.compile(r'\s*<a href="login\.html" id="authBtn" class="login-btn">Login</a>', re.DOTALL)

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    new_content = mobile_login_pattern.sub('', content)
    new_content = desktop_login_pattern.sub('', new_content)
    
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file}")
