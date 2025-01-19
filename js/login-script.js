// 檢查是否已登入，如果已登入則跳轉到 index.html
document.addEventListener('DOMContentLoaded', function() {
    const user = SessionStorageUtil.getItem('user');
    if (user) {
        window.location.href = 'index.html';
    }
});

// 在 Google API 載入完成後執行
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

function handleLogin(response) {
    const googleLoginButton = document.getElementById('google-login');
    const loadingIcon = document.getElementById('loading-icon');

    const profile = parseJwt(response.credential);
    if (!profile.email.endsWith('@tkp.edu.hk')) {
        alert('登入失敗！\n只允許使用 tkp.edu.hk 網域的電郵登入。');
        document.getElementById('login-message').textContent = '登入失敗，請重試！';
        return;
    }

    // 隱藏 Google 登入按鈕
    googleLoginButton.style.display = 'none';
    // 顯示載入圖示
    loadingIcon.style.display = 'block';
    // 隱藏登入失敗訊息
    document.getElementById('login-message').textContent = '';

    // 記錄登入
    fetch('https://script.google.com/macros/s/AKfycbxPyOhVr66zhrqbP8eInx3gLahXI6w1PzYEv4n9DFGiNBxWJ9cexxFSvN-qaDIn3O_L/exec', {
        redirect: "follow",
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8",
        },
        // 发送电子邮件
        body: JSON.stringify({ email: profile.email, name: profile.name })
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.status) {
                // 成功登录，跳转到主页面
                console.log("成功登录，跳转到主页面");
                SessionStorageUtil.setItem('user', data.profile);
                window.location.href = "index.html";
            } else {
                // 登录失败，显示错误信息
                document.getElementById('login-message').textContent = '登入失敗，請重試！';
                googleLoginButton.style.removeProperty('display');
                loadingIcon.style.display = 'none';
            }
        })

}

function parseJwt(token) {
    const base64Url = token.split('.')[1]; // 獲得JWT的Payload部分
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // 替換字符，使其符合base64的要求
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); // 將字符轉換為16進制
    }).join(''));

    return JSON.parse(jsonPayload); // 返回解碼後的JSON對象
}