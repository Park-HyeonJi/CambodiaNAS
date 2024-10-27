document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    loadGroupsForUser();
    toggleInputFields();
});

function openHelpModal() {
    document.getElementById('helpModal').style.display = 'block';
}

function closeHelpModal() {
    document.getElementById('helpModal').style.display = 'none';
}

// 1행: 그룹 및 유저
function loadGroupsForUser() {
    fetch('/get_groups')
        .then(response => response.json())
        .then(groups => {
            const groupSelect = document.getElementById('userGroup');
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
    const selectedGroup = document.getElementById('userGroup').value;
    
    fetch(`/get_users?group=${selectedGroup}`)
        .then(response => response.json())
        .then(users => {
            const userSelect = document.getElementById('userID');
            userSelect.innerHTML = '';

            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;
                userSelect.appendChild(option);
            });

            // Breakfast 버튼을 디폴트로 활성화
            const defaultCategory = document.querySelector('.time-categories button[data-category="Breakfast"]');
            setActive(defaultCategory);
        })
        .catch(error => console.error('Error loading users:', error));
}

function loadData() {
    loadFoodList();   // 음식 리스트를 불러옵니다.
}

// time-categroeis 버튼 클릭 시 호출
function setActive(button) {
    document.querySelectorAll('.time-categories button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // 음식 리스트 초기화
    loadData();
}

// 첫 번째 컨테이너
function loadFoodList() {
    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;
    var viewDate = document.getElementById('date').value;
    var activeCategory = document.querySelector('.time-categories button.active').dataset.category;

    fetch(`/get_food_list?userGroup=${userGroup}&userID=${userID}&viewDate=${viewDate}`)
    .then(response => response.json())
    .then(data => {
        // console.log('Fetched data:', data); // 데이터 확인을 위해 추가
        document.querySelectorAll('.food-items tbody').forEach(tbody => tbody.innerHTML = ""); // 기존 데이터를 초기화

        var tableBody = document.querySelector(`.food-items tbody[data-category='${activeCategory}']`);
        var uniqueFoods = [];

        data.forEach(food => {
            if (food['TIME'] === activeCategory && !uniqueFoods.some(item => item['FOODNAME'] === food['FOODNAME'])) {
                uniqueFoods.push(food);
                var tr = document.createElement("tr");
                tr.innerHTML = `<td>${food['FOODID']}</td><td>${food['FOODNAME']}</td>`;

                tr.setAttribute('data-food-code', food['FOODID']);
                tr.setAttribute('data-time-category', food['TIME']);

                tr.onclick = function() {
                    tableBody.querySelectorAll('tr').forEach(r => r.style.backgroundColor = '');
                    tr.style.backgroundColor = 'lightgray';
        
                    // 행을 클릭할 때 재료 로드
                    loadIngredients(food);
                };
                tableBody.appendChild(tr);
            }
        });
        loadAllFoodList();
    });
}

function deleteFood() {
    var selectedRow = document.querySelector('.food-items tbody tr[style="background-color: lightgray;"]');
    
    if (!selectedRow) {
        alert("Please select a food item to delete.");
        return;
    }

    var foodCode = selectedRow.getAttribute('data-food-code');
    var timeCategory = selectedRow.getAttribute('data-time-category');
    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;
    var viewDate = document.getElementById('date').value;

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the selected food item (${selectedRow.cells[1].textContent})?`)) {
        return;
    }

    fetch('/delete_user_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            foodCode: foodCode,
            userGroup: userGroup,
            userID: userID,
            viewDate: viewDate,
            timeCategory: timeCategory
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Food item deleted successfully.');
            loadFoodList(); // Reload the food list after deletion
        } else {
            alert('Error deleting food item: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error deleting food item:', error);
        alert('An error occurred while deleting the food item.');
    });
}

// 두 번째 컨테이너
function toggleInputFields() {
    var codeInput = document.getElementById("codeInput");
    var nameInput = document.getElementById("nameInput");
    var searchType = document.querySelector('input[name="searchType"]:checked').value;

    if (searchType === "code") {
        codeInput.disabled = false;
        nameInput.disabled = true;
    } else {
        codeInput.disabled = true;
        nameInput.disabled = false;
    }
}

// Pagination
let currentPage = 1;
const limit = 10; // 페이지당 표시할 아이템 수
let totalPages = 1;
let currentSearchResults = []; // 현재 검색 결과를 저장하는 배열

function searchFood() {
    var searchType = document.querySelector('input[name="searchType"]:checked').value;
    var searchValue = (searchType === "code") ? document.getElementById("codeInput").value : document.getElementById("nameInput").value;

    fetch('/search_food', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ searchType: searchType, searchValue: searchValue })
    })
    .then(response => response.json())
    .then(data => {
        // console.log(data)
        // 중복 제거
        const uniqueResults = [];
        const seenCodes = new Set();

        data.forEach(row => {
            if (!seenCodes.has(row['FOODID'])) {
                seenCodes.add(row['FOODID']);
                uniqueResults.push(row);
            }
        });

        currentSearchResults = uniqueResults;
        totalPages = Math.ceil(currentSearchResults.length / limit);
        currentPage = 1; // 검색 후 첫 페이지로 이동
        renderSearchResults(); // 페이지를 초기화하며 결과를 렌더링
    });
}

function renderSearchResults() {
    const tableBody = document.querySelector("#foodTable tbody");
    tableBody.innerHTML = ""; // 기존 데이터를 초기화

    const start = (currentPage - 1) * limit;
    const end = start + limit;
    const resultsToShow = currentSearchResults.slice(start, end);

    resultsToShow.forEach(row => {
        var tr = document.createElement("tr");
        tr.innerHTML = `<td>${row['FOODID']}</td><td>${row['FOODNAME']}</td>`;
        tr.onclick = function() {
            tableBody.querySelectorAll('tr').forEach(r => r.style.backgroundColor = '');
            tr.style.backgroundColor = 'lightgray';
            tr.dataset.selected = true;
        };
        tableBody.appendChild(tr);
    });

    document.getElementById('prevPageFoodBtn').disabled = currentPage === 1;
    document.getElementById('nextPageFoodBtn').disabled = currentPage === totalPages;
}

document.getElementById('prevPageFoodBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderSearchResults();
    }
});

document.getElementById('nextPageFoodBtn').addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        renderSearchResults();
    }
});

// 음식 추가
function addToFoodList() {
    document.querySelectorAll("#foodTable tbody tr").forEach(row => {
        row.addEventListener('click', function() {
            // 모든 행의 data-selected 속성을 제거
            document.querySelectorAll("#foodTable tbody tr").forEach(r => r.removeAttribute('data-selected'));
            
            // 클릭한 행에 data-selected 속성을 추가
            this.setAttribute('data-selected', 'true');
        });
    });
    
    var selectedRow = document.querySelector("#foodTable tbody tr[data-selected='true']");
    if (!selectedRow) return alert("Please select a food item to add");

    var foodCode = selectedRow.cells[0].textContent;
    var foodName = selectedRow.cells[1].textContent;
    var timeCategory = document.querySelector('.time-categories button.active').dataset.category;
    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;
    var viewDate = document.getElementById('date').value;

    // console.log(foodCode, foodName, timeCategory, userGroup, userID, viewDate)

    fetch('/add_food', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            foodCode: foodCode,
            foodName: foodName,
            timeCategory: timeCategory,
            userGroup: userGroup,
            userID: userID,
            viewDate: viewDate
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            loadFoodList();
            // loadAllFoodList();
        } else {
            alert("Error adding food: " + data.message);
        }
    });
}

// 세 번째 컨테이너
function saveIntakeRatio() {
    // 선택된 음식 정보 가져오기
    var selectedRow = document.querySelector('.food-items tbody tr[style="background-color: lightgray;"]');
    if (!selectedRow) {
        alert("Please select a food item to update.");
        return;
    }

    var foodCode = selectedRow.getAttribute('data-food-code');
    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;
    var viewDate = document.getElementById('date').value;
    var timeCategory = selectedRow.getAttribute('data-time-category');

    // 입력된 섭취 비율
    var intakeRatio = parseFloat(document.getElementById('intakeInput').value);
    // const intakeValue = parseFloat(document.getElementById('intakeInput').value);
    
    // 입력 값 검증
    if (isNaN(intakeRatio) || intakeRatio < 0 || intakeRatio > 100) {
        alert('Please enter a valid percentage (0-100).');
        return;
    }

    // 데이터 업데이트
    fetch('/update_intake_ratio', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            foodCode: foodCode,
            userGroup: userGroup,
            userID: userID,
            viewDate: viewDate,
            timeCategory: timeCategory,
            intakeRatio: intakeRatio
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Intake ratio updated successfully.');
            loadAllFoodList()
        } else {
            alert('Error updating intake ratio: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error updating intake ratio:', error);
        alert('An error occurred while updating intake ratio.');
    });
}

function loadIngredients(food) {
    console.log("재료 로드 데이터:", food)

    // 테이블 초기화
    var ingredientTableBody = document.getElementById('ingredientTableBody');
    ingredientTableBody.innerHTML = "";

    // 섭취 비율 초기화
    document.getElementById('intakeInput').value = food['INTAKE_RATIO'];

    // 음식의 재료 정보 조회
    fetch(`/get_food_ingredients?foodCode=${food['FOODID']}`)
    .then(response => response.json())
    .then(data => {
        console.log(data)

        data.forEach(ingredient => {
            var tr = document.createElement("tr");
            tr.innerHTML = `<td>${ingredient['INGID']}</td>
            <td>${ingredient['INGNAME_EN']}</td>
            <td>${ingredient['1 person (g)']}</td>`;
            ingredientTableBody.appendChild(tr);
        });
    });
}

// 3행: 영양 성분 테이블
function loadAllFoodList() {
    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;
    var viewDate = document.getElementById('date').value;

    fetch(`/get_food_list?userGroup=${userGroup}&userID=${userID}&viewDate=${viewDate}`)
    .then(response => response.json())
    .then(data => {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format received from server');
        }
        
        // 유저 데이터에서 값 가져옴
        console.log("영양성분 테이블 받은 데이터", data)

        // 테이블 초기화
        var mealTbody = document.getElementById('nutrition-tbody');
        mealTbody.innerHTML = '';
        dailyTotalNutrients = {};

        var categories = ['Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Midnight Snack'];
        var foods = [];
        var totalNutrients = {
            Energy: 0, Water: 0, Protein: 0, Fat: 0, Carbo: 0, Fiber: 0,
            CA: 0, FE: 0, ZN: 0, VA: 0, VB1: 0, VB2: 0, VB3: 0, VB6: 0, Fol: 0,
            VB12: 0, VC: 0, VD: 0, NA: 0
        };
        
        categories.forEach(category => {
            data.filter(food => food['TIME'] === category).forEach(food => {
                const foodKey = `${food['FOODID']}_${category}`;

                if (!foods[foodKey]) {
                    // 첫 번째 재료로 데이터 초기화
                    foods[foodKey] = {
                        category: category,
                        foodName: food['FOODNAME'],
                        nutrientTotals: {
                            Energy: food['Energy'] || 0,
                            Water: food['Water'] || 0,
                            Protein: food['Protein'] || 0,
                            Fat: food['Fat'] || 0,
                            Carbo: food['Carbo'] || 0,
                            Fiber: food['Fiber'] || 0,
                            CA: food['CA'] || 0,
                            FE: food['FE'] || 0,
                            ZN: food['ZN'] || 0,
                            VA: food['VA'] || 0,
                            VB1: food['VB1'] || 0,
                            VB2: food['VB2'] || 0,
                            VB3: food['VB3'] || 0,
                            VB6: food['VB6'] || 0,
                            Fol: food['Fol'] || 0,
                            VB12: food['VB12'] || 0,
                            VC: food['VC'] || 0,
                            VD: food['VD'] || 0,
                            NA: food['NA'] || 0
                        },
                        ingredientCount: 1
                    };
                } else {
                    // 기존 데이터에 영양 성분을 누적하고 재료 수 증가
                    foods[foodKey].nutrientTotals.Energy += food['Energy'] || 0;
                    foods[foodKey].nutrientTotals.Water += food['Water'] || 0;
                    foods[foodKey].nutrientTotals.Protein += food['Protein'] || 0;
                    foods[foodKey].nutrientTotals.Fat += food['Fat'] || 0;
                    foods[foodKey].nutrientTotals.Carbo += food['Carbo'] || 0;
                    foods[foodKey].nutrientTotals.Fiber += food['Fiber'] || 0;
                    foods[foodKey].nutrientTotals.CA += food['CA'] || 0;
                    foods[foodKey].nutrientTotals.FE += food['FE'] || 0;
                    foods[foodKey].nutrientTotals.ZN += food['ZN'] || 0;
                    foods[foodKey].nutrientTotals.VA += food['VA'] || 0;
                    foods[foodKey].nutrientTotals.VB1 += food['VB1'] || 0;
                    foods[foodKey].nutrientTotals.VB2 += food['VB2'] || 0;
                    foods[foodKey].nutrientTotals.VB3 += food['VB3'] || 0;
                    foods[foodKey].nutrientTotals.VB6 += food['VB6'] || 0;
                    foods[foodKey].nutrientTotals.Fol += food['Fol'] || 0;
                    foods[foodKey].nutrientTotals.VB12 += food['VB12'] || 0;
                    foods[foodKey].nutrientTotals.VC += food['VC'] || 0;
                    foods[foodKey].nutrientTotals.VD += food['VD'] || 0;
                    foods[foodKey].nutrientTotals.NA += food['NA'] || 0;
                    foods[foodKey].ingredientCount += 1;
                }
            });
        });

        // 누적된 영양 성분 데이터를 테이블에 추가
        Object.values(foods).forEach(result => {
            appendNutritionRow(result);

            // 하루 총 영양 성분에 누적
            for (let key in totalNutrients) {
                totalNutrients[key] += result.nutrientTotals[key] || 0;
            }
        });

        appendTotalRow(totalNutrients);
    })
    .catch(error => {
        console.error('Error fetching food list:', error);
    });
}

function appendNutritionRow(result) {
    var mealTbody = document.getElementById('nutrition-tbody');

    if (mealTbody) {
        var tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${result.category}</td>
            <td>${result.foodName}</td>
            <td>${result.nutrientTotals['Energy'].toFixed(2)}</td>
            <td>${result.nutrientTotals['Water'].toFixed(2)}</td>
            <td>${result.nutrientTotals['Protein'].toFixed(2)}</td>
            <td>${result.nutrientTotals['Fat'].toFixed(2)}</td>
            <td>${result.nutrientTotals['Carbo'].toFixed(2)}</td>
            <td>${result.nutrientTotals['Fiber'].toFixed(2)}</td>
            <td>${result.nutrientTotals['CA'].toFixed(2)}</td>
            <td>${result.nutrientTotals['FE'].toFixed(2)}</td>
            <td>${result.nutrientTotals['ZN'].toFixed(2)}</td>
            <td>${result.nutrientTotals['VA'].toFixed(2)}</td>
            <td>${result.nutrientTotals['VB1'].toFixed(2)}</td>
            <td>${result.nutrientTotals['VB2'].toFixed(2)}</td>
            <td>${result.nutrientTotals['VB3'].toFixed(2)}</td>
            <td>${result.nutrientTotals['VB6'].toFixed(2)}</td>
            <td>${result.nutrientTotals['Fol'].toFixed(2)}</td>
            <td>${result.nutrientTotals['VB12'].toFixed(2)}</td>
            <td>${result.nutrientTotals['VC'].toFixed(2)}</td>
            <td>${result.nutrientTotals['VD'].toFixed(2)}</td>
            <td>${result.nutrientTotals['NA'].toFixed(2)}</td>
        `;
        mealTbody.appendChild(tr);
    } else {
        console.error('Element with ID "nutrition-tbody" not found');
    }
}

let dailyTotalNutrients = {};
function appendTotalRow(totalNutrients) {
    var mealTbody = document.getElementById('nutrition-tbody');
    dailyTotalNutrients = totalNutrients;

    if (mealTbody) {
        var tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="2"><strong>Daily Total</strong></td>
            <td>${totalNutrients['Energy'].toFixed(2)}</td>
            <td>${totalNutrients['Water'].toFixed(2)}</td>
            <td>${totalNutrients['Protein'].toFixed(2)}</td>
            <td>${totalNutrients['Fat'].toFixed(2)}</td>
            <td>${totalNutrients['Carbo'].toFixed(2)}</td>
            <td>${totalNutrients['Fiber'].toFixed(2)}</td>
            <td>${totalNutrients['CA'].toFixed(2)}</td>
            <td>${totalNutrients['FE'].toFixed(2)}</td>
            <td>${totalNutrients['ZN'].toFixed(2)}</td>
            <td>${totalNutrients['VA'].toFixed(2)}</td>
            <td>${totalNutrients['VB1'].toFixed(2)}</td>
            <td>${totalNutrients['VB2'].toFixed(2)}</td>
            <td>${totalNutrients['VB3'].toFixed(2)}</td>
            <td>${totalNutrients['VB6'].toFixed(2)}</td>
            <td>${totalNutrients['Fol'].toFixed(2)}</td>
            <td>${totalNutrients['VB12'].toFixed(2)}</td>
            <td>${totalNutrients['VC'].toFixed(2)}</td>
            <td>${totalNutrients['VD'].toFixed(2)}</td>
            <td>${totalNutrients['NA'].toFixed(2)}</td>
        `;
        mealTbody.appendChild(tr);
    } else {
        console.error('Element with ID "nutrition-tbody" not found');
    }
}

// 엑셀로 내보내기
function exportExcel() {
    const table = document.querySelector('.nutrition-table');
    const data = [];
    const headers = [];

    // 헤더 행의 텍스트를 가져옵니다.
    const headerCells = table.querySelectorAll('thead th');
    headerCells.forEach(header => headers.push(header.textContent.trim()));
    data.push(headers);

    // 본문 행의 텍스트를 가져옵니다.
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => rowData.push(cell.textContent.trim()));
        data.push(rowData);
    });

    // 선택된 유저의 ID와 이름을 가져옵니다.
    const selectedUserID = document.getElementById('userID').value;
    const selectedUserName = document.getElementById('userID').options[document.getElementById('userID').selectedIndex].text;

    // 서버로 데이터를 전송하여 엑셀 파일로 다운로드합니다.
    fetch('/download_nutrition', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            data: data,
            userName: selectedUserName
        })
    })
    .then(response => response.blob())
    .then(blob => {
        // 파일 이름에 유저 이름을 포함
        const fileName = `nutritional_information_${selectedUserName}.xlsx`;

        // 파일을 다운로드
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
    })
    .catch(error => console.error('Error exporting to Excel:', error));
}

// 차트 생성
function submitChartForm() {
    if (!dailyTotalNutrients || Object.values(dailyTotalNutrients).every(value => value === 0)) {
        alert('Daily total nutrients not calculated yet.');
        return;
    }

    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;

    fetch(`/get_user_info?userGroup=${userGroup}&userID=${userID}`)
    .then(response => response.json())
    .then(userInfo => {
        console.log(userInfo)
        document.getElementById('userGender').value = userInfo.gender;
        document.getElementById('userAge').value = userInfo.age;
    })
    .catch(error => console.error('Error loading user info:', error));

    // Daily total 행의 값을 가져오기
    document.getElementById('currentMealEnergy').value = dailyTotalNutrients['Energy'].toFixed(2);
    document.getElementById('currentMealProtein').value = dailyTotalNutrients['Protein'].toFixed(2);
    document.getElementById('currentMealCA').value = dailyTotalNutrients['CA'].toFixed(2);
    document.getElementById('currentMealFE').value = dailyTotalNutrients['FE'].toFixed(2);
    document.getElementById('currentMealZN').value = dailyTotalNutrients['ZN'].toFixed(2);
    document.getElementById('currentMealVA').value = dailyTotalNutrients['VA'].toFixed(2);
    document.getElementById('currentMealVB1').value = dailyTotalNutrients['VB1'].toFixed(2);
    document.getElementById('currentMealVB2').value = dailyTotalNutrients['VB2'].toFixed(2);
    document.getElementById('currentMealVB3').value = dailyTotalNutrients['VB3'].toFixed(2);
    document.getElementById('currentMealFol').value = dailyTotalNutrients['Fol'].toFixed(2);
    document.getElementById('currentMealVC').value = dailyTotalNutrients['VC'].toFixed(2);
    document.getElementById('currentMealVD').value = dailyTotalNutrients['VD'].toFixed(2);
    document.getElementById('currentMealNA').value = dailyTotalNutrients['NA'].toFixed(2);

    // 폼 제출
    document.getElementById('chartForm').submit();
}