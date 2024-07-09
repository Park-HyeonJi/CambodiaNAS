document.addEventListener('DOMContentLoaded', () => {
    loadUserGroups();
});

function loadUserGroups() {
    let groups = JSON.parse(localStorage.getItem('groups')) || [];
    const userGroupSelect = document.getElementById('user-group');
    userGroupSelect.innerHTML = '';

    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        userGroupSelect.appendChild(option);
    });
}

function generateStatistics() {
    const ageStart = document.getElementById('age-start').value;
    const ageEnd = document.getElementById('age-end').value;

    // 나이 범위가 음수인지 확인
    if (ageStart < 0 || ageEnd < 0 || ageStart > ageEnd) {
        alert('The age range is wrong. Please enter again.');
        return; // 조건에 맞지 않으면 함수 종료
    }

    // 조건에 맞다면 통계 생성 작업 수행
    alert('Statistics generated!');
}

function exportToExcel() {
    // 엑셀로 내보내기 로직을 여기에 추가하세요
    alert('Exported to Excel!');
}
