document.addEventListener('DOMContentLoaded', () => {
    loadGroups();
});

let selectedGroup = null;

function loadGroups() {
    let groups = JSON.parse(localStorage.getItem('groups')) || [];
    const groupList = document.getElementById('group-list');
    groupList.innerHTML = '';

    groups.forEach(group => {
        const row = document.createElement('tr');
        row.addEventListener('click', () => selectGroup(row, group)); // 클릭 이벤트 리스너 추가
        const cell = document.createElement('td');
        cell.textContent = group;
        row.appendChild(cell);
        groupList.appendChild(row);
    });
}

let selectedRow = null;
let selectedGroupName = null;

function selectGroup(row, groupName) {
    if (selectedRow) {
        selectedRow.classList.remove('selected'); // 이전에 선택된 행에서 선택 클래스 제거
    }

    selectedRow = row;
    selectedRow.classList.add('selected'); // 선택된 행에 선택 클래스 추가
    
    showGroupDetails(groupName); // 선택된 그룹의 상세 정보 표시
}

function showGroupDetails(groupName) {
    selectedGroupName = groupName;
    const groupDesc = localStorage.getItem(groupName + '_desc') || '';
    document.getElementById('group-name').value = groupName;
    document.getElementById('group-desc').value = groupDesc;
}

function saveGroup() {
    if (!selectedGroupName) {
        alert('저장할 그룹을 선택하세요.');
        return;
    }

    let newGroupName = document.getElementById('group-name').value;
    let groupDesc = document.getElementById('group-desc').value;

    let groups = JSON.parse(localStorage.getItem('groups')) || [];
    if (newGroupName !== selectedGroupName && groups.includes(newGroupName)) {
        alert('이미 존재하는 그룹명입니다.');
        return;
    }

    groups = groups.map(group => group === selectedGroupName ? newGroupName : group);
    localStorage.setItem('groups', JSON.stringify(groups));

    localStorage.removeItem(selectedGroupName + '_desc');
    localStorage.setItem(newGroupName + '_desc', groupDesc);

    selectedGroupName = newGroupName; // 선택된 그룹명 갱신
    loadGroups(); // 그룹 목록 다시 불러오기
}


function addGroup() {
    let groupName = prompt("추가할 그룹명을 입력하세요:");
    if (groupName) {
        let groups = JSON.parse(localStorage.getItem('groups')) || [];
        if (!groups.includes(groupName)) {
            groups.push(groupName);
            localStorage.setItem('groups', JSON.stringify(groups));
            localStorage.setItem(groupName + '_desc', '');
            loadGroups();
        } else {
            alert('이미 존재하는 그룹명입니다.');
        }
    }
}

function deleteGroup() {
    if (selectedGroupName) { // selectedGroupName을 사용하여 삭제할 그룹 확인
        let groups = JSON.parse(localStorage.getItem('groups')) || [];
        groups = groups.filter(group => group !== selectedGroupName); // selectedGroupName으로 비교
        localStorage.removeItem(selectedGroupName + '_desc'); // 선택된 그룹의 설명 제거
        localStorage.setItem('groups', JSON.stringify(groups));
        loadGroups();
        clearGroupDetails();
    } else {
        alert('삭제할 그룹을 선택하세요.');
    }
}


function clearGroupDetails() {
    selectedGroup = null;
    document.getElementById('group-name').value = '';
    document.getElementById('group-desc').value = '';
}
