const correctAuthCode = 'pro1101'; // 서버에서 검증할 코드

function showUserTypeModal() {
    document.getElementById('userTypeModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('userTypeModal').style.display = 'none';
}

function showAdvancedAuthModal() {
    closeModal();
    document.getElementById('advancedAuthModal').style.display = 'block';
}

function closeAdvancedAuthModal() {
    document.getElementById('advancedAuthModal').style.display = 'none';
}

function selectUserType(type) {
    localStorage.setItem('userType', type);
    closeModal();

    if (type === 'basic') {
        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userType: 'basic' }),
            credentials: 'include'
        }).then(response => {
            if (response.ok) {
                window.location.assign('/24h');
            } else {
                alert('로그인에 실패했습니다.');
            }
        }).catch(error => {
            console.error('Error:', error);
        });
    }
}

function validateAuthCode() {
    const enteredCode = document.getElementById('authCode').value;

    if (enteredCode === correctAuthCode) {
        localStorage.setItem('userType', 'advanced');

        fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userType: 'advanced' }),
            credentials: 'include'
        })
        .then(response => {
            if (response.ok) {
                window.location.assign('/m-gandu');
            } else {
                alert('Login failed. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error logging in:', error);
            alert('An error occurred during login.');
        });
    } else {
        alert('The code is incorrect.');
    }
}
