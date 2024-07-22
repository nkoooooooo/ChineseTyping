window.onload = function () {
    if (getCookie('isLogin')) {
        window.location.href = '/index.html';
    }

    clearAllCookies();

    google.accounts.id.initialize({
        client_id: "207480084362-mc0she8jhrhd2bu01ifg8quo1ujksup6.apps.googleusercontent.com",
        callback: handleLogin
    });

    const buttonDiv = document.getElementById('google-login');
    google.accounts.id.renderButton(buttonDiv, {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        logo_alignment: 'left'
    });
};

async function handleLogin(response) {
    const profile = parseJwt(response.credential);
    if (!profile.email.endsWith('@tkp.edu.hk')) {
        alert('登入失敗！\n只允許使用 tkp.edu.hk 網域的電郵登入。');
        document.getElementById('login-message').textContent = '登入失敗，請重試！';
        return;
    }

    // 发送电子邮件到 Google App Script
    fetch('https://script.google.com/macros/s/AKfycbw-J7yVimq3IVc2xPXz3QgOIsm6p2FipAfFJObx3WXxajBhR4-iev1BRbKOLlR1MW5n/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: profile.email })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Response:', data);
        console.log('Profile:', profile);
      })
      .catch(error => {
        console.error('Error:', error);
      });

}

function parseJwt(token) {
    const base64Url = token.split('.')[1]; // 獲得JWT的Payload部分
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // 替換字符，使其符合base64的要求
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); // 將字符轉換為16進制
    }).join(''));

    return JSON.parse(jsonPayload); // 返回解碼後的JSON對象
}

// Cookie操作工具函数
function setCookie(name, value, settings) {
    document.cookie = `${name}=${encodeURIComponent(value)}; ${settings}`;
}

function getCookie(name) {
    return document.cookie.split(';').find(item => item.trim().startsWith(`${name}=`));
}

function deleteCookie(name) {
    document.cookie = `${name}=; max-age=-1; path=/;`;
}

function clearAllCookies() {
    // 清除所有cookie信息
    deleteCookie('email');
    deleteCookie('username');
    deleteCookie('isLogin');
    deleteCookie('forceUpdate');
    localStorage.clear();
}