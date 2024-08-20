document.addEventListener('DOMContentLoaded', () => {
    console.log('Clearing local storage...');
    localStorage.clear();
    console.log('Local storage cleared.');
    loadGroups();
    loadGroupsForUser();
    clearGroupDetails();
});

let selectedRow = null; // 선택된 행을 추적하기 위한 변수
let selectedGroup = null;
let selectedUserId = null;

// 그룹 관리 로직
function loadGroups() {
    fetch('/get_groups')
        .then(response => response.json())
        .then(groups => {
            const groupList = document.getElementById('group-list');
            groupList.innerHTML = ''; // 기존 리스트 초기화

            groups.forEach(group => {
                const row = document.createElement('tr');
                
                // 클릭 이벤트 핸들러 추가
                row.addEventListener('click', () => selectGroup(row, group.name));
                
                row.style.cursor = 'pointer'; // 커서 스타일 설정
                
                const cell = document.createElement('td');
                cell.textContent = group.name; // 그룹 이름을 셀에 표시
                row.appendChild(cell);
                groupList.appendChild(row); // 리스트에 행 추가
            });

            clearGroupDetails(); // 그룹 정보 초기화
        })
        .catch(error => console.error('Error loading groups:', error));
}


function selectGroup(row, groupName) {
    if (selectedRow) {
        selectedRow.classList.remove('selected');
    }

    selectedRow = row;
    selectedRow.classList.add('selected');

    fetch(`/get_groups`)
        .then(response => response.json())
        .then(groups => {
            const group = groups.find(g => g.name === groupName);

            selectedGroupName = groupName;
            document.getElementById('group-name').value = group.name;
            document.getElementById('group-desc').value = group.description || ''; // description이 비어 있을 경우 기본값 설정
        })
        .catch(error => console.error('Error showing group details:', error));
}


function showGroupDetails(groupName) {
    fetch(`/get_groups`)
        .then(response => response.json())
        .then(groups => {
            const group = groups.find(g => g.name === groupName);

            selectedGroupName = groupName;
            document.getElementById('group-name').value = group.name;
            document.getElementById('group-desc').value = group.description;
        })
        .catch(error => console.error('Error showing group details:', error));
}

function clearGroupDetails() {
    selectedGroup = null;
    document.getElementById('group-name').value = '';
    document.getElementById('group-desc').value = '';
}

function saveGroup() {
    const groupName = document.getElementById('group-name').value;
    const groupDesc = document.getElementById('group-desc').value;

    if (!groupName) {
        alert("Group name cannot be empty.");
        return;
    }

    fetch('/save_group', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: groupName, description: groupDesc }),
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === 'success') {
            loadGroups(); // 그룹 리스트를 다시 로드
            alert('Group information updated successfully.');
        } else {
            alert('Failed to update group information: ' + result.message);
        }
    })
    .catch(error => console.error('Error updating group information:', error));
}


function deleteGroup() {
    const groupName = document.getElementById('group-name').value;

    fetch('/delete_group', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: groupName }),
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === 'success') {
            loadGroups();
        } else {
            console.error('Failed to delete group');
        }
    })
    .catch(error => console.error('Error deleting group:', error));
}

function addGroup() {
    let groupName = prompt("Enter the group name to add:");
    if (groupName) {
        fetch('/get_groups')
            .then(response => response.json())
            .then(groups => {
                if (!groups.some(g => g.name === groupName)) {
                    // 기본값으로 빈 문자열을 사용
                    fetch('/save_group', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name: groupName, description: '' }),
                    })
                    .then(response => response.json())
                    .then(result => {
                        if (result.status === 'success') {
                            loadGroups();  // 그룹 리스트를 다시 로드
                        } else {
                            alert('Failed to save group.');
                        }
                    })
                    .catch(error => console.error('Error saving group:', error));
                } else {
                    alert('This group name already exists.');
                }
            })
            .catch(error => console.error('Error loading groups:', error));
    }
}



// 사용자 관리 로직
function loadGroupsForUser() {
    fetch('/get_groups')
        .then(response => response.json())
        .then(groups => {
            const groupSelect = document.getElementById('group-select');
            groupSelect.innerHTML = '';

            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.name;
                option.textContent = group.name;
                groupSelect.appendChild(option);
            });

            loadUsers();
        })
        .catch(error => console.error('Error loading groups for users:', error));
}

function loadUsers() {
    const selectedGroup = document.getElementById('group-select').value;

    fetch(`/get_users?group=${selectedGroup}`)
        .then(response => response.json())
        .then(users => {
            const userList = document.getElementById('user-list');
            userList.innerHTML = '';

            users.forEach(user => {
                const row = document.createElement('tr');
                row.addEventListener('click', () => selectUser(row, user));
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.name}</td>
                    <td>${user.gender}</td>
                    <td>${user.age}</td>
                    <td>${user.height}</td>
                    <td>${user.weight}</td>
                `;
                userList.appendChild(row);
            });

            selectedUserId = null;
        })
        .catch(error => console.error('Error loading users:', error));
}

function selectUser(row, user) {
    if (selectedRow) {
        selectedRow.classList.remove('selected');
    }

    selectedRow = row;
    selectedRow.classList.add('selected');
    
    showUserDetails(user);
}

function showUserDetails(user) {
    selectedUserId = user.id;
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-gender').value = user.gender;
    document.getElementById('user-age').value = user.age;
    document.getElementById('user-height').value = user.height;
    document.getElementById('user-weight').value = user.weight;
}

function saveUser() {
    const user = {
        id: document.getElementById('user-id').value,
        name: document.getElementById('user-name').value,
        gender: document.getElementById('user-gender').value,
        age: document.getElementById('user-age').value,
        height: document.getElementById('user-height').value,
        weight: document.getElementById('user-weight').value,
        group: document.getElementById('group-select').value,
    };

    fetch('/save_user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
    })
    .then(response => response.json())
    .then(result => {
        console.log('Server response:', result); // 서버 응답 로그
        if (result.status === 'success') {
            loadUsers(); // 사용자 리스트를 다시 로드
            alert('User information updated successfully.');
        } else {
            alert('Failed to update user information: ' + result.message);
        }
    })
    .catch(error => console.error('Error saving user:', error));
}


function deleteUser() {
    const userId = document.getElementById('user-id').value;
    const userGroup = document.getElementById('group-select').value;

    if (!userId) {
        alert('Please select a user to delete.');
        return;
    }

    fetch('/delete_user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: userId, group: userGroup }),
    })
    .then(response => response.json())
    .then(result => {
        console.log('Delete response:', result);  // 서버 응답 로그
        if (result.status === 'success') {
            loadUsers();  // 삭제 후 사용자 목록 다시 로드
            alert('User deleted successfully.');
        } else {
            alert('Failed to delete user: ' + result.message);
        }
    })
    .catch(error => console.error('Error deleting user:', error));
}

function addUser() {
    // 사용자 정보 입력란을 모두 빈칸으로 초기화
    document.getElementById('user-id').value = '';
    document.getElementById('user-name').value = '';
    document.getElementById('user-gender').value = 'male'; // 기본값 설정
    document.getElementById('user-age').value = '';
    document.getElementById('user-height').value = '';
    document.getElementById('user-weight').value = '';

    // 필요한 경우, 추가적인 동작을 여기에 작성할 수 있습니다.
}


function downloadExcel() {
    const selectedGroup = document.getElementById('group-select').value;
    
    // 서버에 요청을 보내고 엑셀 파일 다운로드
    window.location.href = `/download_excel?group=${selectedGroup}`;
}