document.addEventListener('DOMContentLoaded', () => {
    loadGroupsForUser();
    toggleInputFields();

    // Breakfast 버튼을 디폴트로 활성화
    const defaultCategory = document.querySelector('.time-categories button[data-category="Breakfast"]');
    setActive(defaultCategory);

    loadAllFoodList();
});

// time-categroeis 버튼 클릭 시 호출
function setActive(button) {
    document.querySelectorAll('.time-categories button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // 음식 리스트 초기화
    loadFoodList();
}

// 3행: 영양 성분 테이블
function loadAllFoodList() {
    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;
    var viewDate = document.getElementById('date').value;

    fetch(`/get_food_list?userGroup=${userGroup}&userID=${userID}&viewDate=${viewDate}`)
    .then(response => response.json())
    .then(data => {
        // console.log('Received data:', data);
        var mealTbody = document.getElementById('nutrition-tbody');
        mealTbody.innerHTML = ''; // 기존 데이터를 초기화

        data['Morning Snack'] = (data['Morning Snack'] || [])
        .concat(data['Morning Snack1'] || [])
        .concat(data['Morning Snack2'] || [])
        .concat(data['Morning snack'] || []);
    
        // 불필요한 다른 Morning Snack 관련 키 삭제
        delete data['Morning Snack1'];
        delete data['Morning Snack2'];
        delete data['Morning snack'];

        var categories = ['Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Midnight Snack'];
        var foods = [];

        categories.forEach(category => {
            if (data[category]) {
                data[category].forEach(food => {
                    //promises.push(loadNutrition(food['Food Code'], food['Food Name'], category));
                    // 중복 제거 부분 수정
                    if (!foods.some(item => item['FOODNAME'] === food['FOODNAME'] && item['Category'] === category)) {
                        foods.push({ ...food, 'Category': category });
                    }
                });
            }
        });

        // 각 음식에 대해 loadNutrition을 호출하고 그 결과를 테이블에 추가
        Promise.all(foods.map(food => loadNutrition(food['FOODID'], food['FOODNAME'], food['Category'])))
        .then(results => {
            var totalNutrients = {
                'ENERC (kcal)': 0, 'WATER (g)': 0, 'PROTCNT (g)': 0, 'FAT (g)': 0, 
                'CHOAVLDF (g)': 0, 'FIBTG (g)': 0, 'CA (mg)': 0, 'FE (mg)': 0, 
                'ZN (mg)': 0, 'VITA_RAE (mcg)': 0, 'VITD (mcg)': 0, 'THIA (mg)': 0, 'RIBF (mg)': 0, 
                'NIA (mg)': 0, 'PANTAC (mg)': 0, 'VITB6 (mg)': 0, 'FOL (mcg)': 0
            };

            results.forEach(result => {
                appendNutritionRow(result);

                // 각 항목의 영양성분을 총합에 추가
                for (var key in totalNutrients) {
                    totalNutrients[key] += parseFloat(result.nutrientTotals[key]) || 0;
                }
            });

            // 총합을 테이블의 마지막 행에 추가
            appendTotalRow(totalNutrients);
        });
    })
    .catch(error => {
        console.error('Error fetching food list:', error);
    });
}

function loadNutrition(foodCode, foodName, category) {
    return new Promise((resolve, reject) => {
        // console.log('loadNutrition function called for:', foodCode, foodName, category);
        fetch('/get_ingredients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ foodCode: foodCode })
        })
        .then(response => response.json())
        .then(ingredientCodes => {
            fetch('/get_nutrition', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ingredientCodes: ingredientCodes })
            })
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    var nutrientTotals = {
                        'ENERC (kcal)': 0, 'WATER (g)': 0, 'PROTCNT (g)': 0, 'FAT (g)': 0, 
                        'CHOAVLDF (g)': 0, 'FIBTG (g)': 0, 'CA (mg)': 0, 'FE (mg)': 0, 
                        'ZN (mg)': 0, 'VITA_RAE (mcg)': 0, 'VITD (mcg)': 0, 'THIA (mg)': 0, 'RIBF (mg)': 0, 
                        'NIA (mg)': 0, 'PANTAC (mg)': 0, 'VITB6 (mg)': 0, 'FOL (mcg)': 0
                    };

                    data.forEach(nutrient => {
                        for (var key in nutrientTotals) {
                            if (nutrient.hasOwnProperty(key)) {
                                nutrientTotals[key] += parseFloat(nutrient[key]) || 0;
                            }
                        }
                    });

                    resolve({ category, foodName, nutrientTotals });
                }
            })
            .catch(error => {
                console.error('Error fetching nutrition data:', error);
                reject(error);
            });
        })
        .catch(error => {
            console.error('Error fetching ingredient codes:', error);
            reject(error);
        });
    });
}

function appendNutritionRow(result) {
    var mealTbody = document.getElementById('nutrition-tbody');

    if (mealTbody) {
        var tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${result.category}</td>
            <td>${result.foodName}</td>
            <td>${result.nutrientTotals['ENERC (kcal)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['WATER (g)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['PROTCNT (g)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['FAT (g)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['CHOAVLDF (g)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['FIBTG (g)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['CA (mg)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['FE (mg)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['ZN (mg)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['VITA_RAE (mcg)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['VITD (mcg)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['THIA (mg)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['RIBF (mg)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['NIA (mg)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['PANTAC (mg)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['VITB6 (mg)'].toFixed(2)}</td>
            <td>${result.nutrientTotals['FOL (mcg)'].toFixed(2)}</td>
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
            <td>${totalNutrients['ENERC (kcal)'].toFixed(2)}</td>
            <td>${totalNutrients['WATER (g)'].toFixed(2)}</td>
            <td>${totalNutrients['PROTCNT (g)'].toFixed(2)}</td>
            <td>${totalNutrients['FAT (g)'].toFixed(2)}</td>
            <td>${totalNutrients['CHOAVLDF (g)'].toFixed(2)}</td>
            <td>${totalNutrients['FIBTG (g)'].toFixed(2)}</td>
            <td>${totalNutrients['CA (mg)'].toFixed(2)}</td>
            <td>${totalNutrients['FE (mg)'].toFixed(2)}</td>
            <td>${totalNutrients['ZN (mg)'].toFixed(2)}</td>
            <td>${totalNutrients['VITA_RAE (mcg)'].toFixed(2)}</td>
            <td>${totalNutrients['VITD (mcg)'].toFixed(2)}</td>
            <td>${totalNutrients['THIA (mg)'].toFixed(2)}</td>
            <td>${totalNutrients['RIBF (mg)'].toFixed(2)}</td>
            <td>${totalNutrients['NIA (mg)'].toFixed(2)}</td>
            <td>${totalNutrients['PANTAC (mg)'].toFixed(2)}</td>
            <td>${totalNutrients['VITB6 (mg)'].toFixed(2)}</td>
            <td>${totalNutrients['FOL (mcg)'].toFixed(2)}</td>
        `;
        mealTbody.appendChild(tr);
    } else {
        console.error('Element with ID "nutrition-tbody" not found');
    }
}

// 1행: 그룹 및 유저
function loadGroupsForUser() {
    console.log('loadGroupsForUser function called');
    let groups = JSON.parse(localStorage.getItem('groups')) || [];
    const groupSelect = document.getElementById('userGroup');
    groupSelect.innerHTML = '';

    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        groupSelect.appendChild(option);
    });

    loadUsers(); // Load users for the first group by default
}

function loadUsers() {
    const selectedGroup = document.getElementById('userGroup').value;
    let users = JSON.parse(localStorage.getItem(selectedGroup + '_users')) || [];

    const userSelect = document.getElementById('userID');
    userSelect.innerHTML = '';

    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        userSelect.appendChild(option);
    });

    selectedUserId = null;
}

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

// 두 번째 컨테이너
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
        console.log(data)
        
        var tableBody = document.querySelector("#foodTable tbody");
        tableBody.innerHTML = "";

        var uniqueFoods = [];
        data.forEach(row => {
            if (!uniqueFoods.some(food => food['FOODNAME'] === row['FOODNAME'])) {
                uniqueFoods.push(row);
                var tr = document.createElement("tr");
                tr.innerHTML = `<td>${row['FOODID']}</td><td>${row['FOODNAME']}</td>`;
                tr.onclick = function() {
                    tableBody.querySelectorAll('tr').forEach(r => r.style.backgroundColor = '');
                    tr.style.backgroundColor = 'lightgray';
                    tr.dataset.selected = true;
                };
                tableBody.appendChild(tr);
            }
        });
    });
}

function addToFoodList() {
    var selectedRow = document.querySelector("#foodTable tbody tr[data-selected='true']");
    if (!selectedRow) return alert("Please select a food item to add");

    var foodCode = selectedRow.cells[0].textContent;
    var foodName = selectedRow.cells[1].textContent;
    var timeCategory = document.querySelector('.time-categories button.active').dataset.category;
    var userGroup = document.getElementById('userGroup').value;
    var userID = document.getElementById('userID').value;
    var viewDate = document.getElementById('date').value;

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
        } else {
            alert("Error adding food: " + data.message);
        }
    });
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
        console.log('Fetched data:', data); // 데이터 확인을 위해 추가
        document.querySelectorAll('.food-items tbody').forEach(tbody => tbody.innerHTML = ""); // 기존 데이터를 초기화

        var tableBody = document.querySelector(`.food-items tbody[data-category='${activeCategory}']`);
        var uniqueFoods = [];

        data[activeCategory].forEach(food => {
            if (!uniqueFoods.some(item => item['FOODNAME'] === food['FOODNAME'])) {
                uniqueFoods.push(food);
                var tr = document.createElement("tr");
                tr.innerHTML = `<td>${food['FOODID']}</td><td>${food['FOODNAME']}</td>`;

                tr.onclick = function() {
                    tableBody.querySelectorAll('tr').forEach(r => r.style.backgroundColor = '');
                    tr.style.backgroundColor = 'lightgray';
        
                    // 행을 클릭할 때 재료 로드
                    loadIngredients(food);
                };
                tableBody.appendChild(tr);
            }
        });
    });
}

// 세 번째 컨테이너
function loadIngredients(food) {
    // ingredientTableBody를 초기화합니다.
    var ingredientTableBody = document.getElementById('ingredientTableBody');
    ingredientTableBody.innerHTML = "";

    // 음식의 재료 정보를 가져옵니다.
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

function loadData() {
    loadFoodList();
}

function copyData() {
    // Copy data functionality
}

// 3행 차트
function submitChartForm() {
    if (!dailyTotalNutrients) {
        alert('Daily total nutrients not calculated yet.');
        return;
    }

    // Daily total 행의 값을 가져오기
    document.getElementById('currentMealEnerckcal').value = dailyTotalNutrients['ENERC (kcal)'].toFixed(2);
    document.getElementById('currentMealEnerckj').value = (dailyTotalNutrients['ENERC (kcal)'] * 4.184).toFixed(2); // kcal to kJ conversion
    document.getElementById('currentMealWaterg').value = dailyTotalNutrients['WATER (g)'].toFixed(2);
    document.getElementById('currentMealProtcntg').value = dailyTotalNutrients['PROTCNT (g)'].toFixed(2);
    document.getElementById('currentMealFatg').value = dailyTotalNutrients['FAT (g)'].toFixed(2);
    document.getElementById('currentMealChoavldfg').value = dailyTotalNutrients['CHOAVLDF (g)'].toFixed(2);
    document.getElementById('currentMealFibtgg').value = dailyTotalNutrients['FIBTG (g)'].toFixed(2);
    document.getElementById('currentMealAshg').value = 0; // Assuming this value is not available in dailyTotalNutrients
    document.getElementById('currentMealCamg').value = dailyTotalNutrients['CA (mg)'].toFixed(2);
    document.getElementById('currentMealFemg').value = dailyTotalNutrients['FE (mg)'].toFixed(2);
    document.getElementById('currentMealZnmg').value = dailyTotalNutrients['ZN (mg)'].toFixed(2);
    document.getElementById('currentMealVitaraemcg').value = dailyTotalNutrients['VITA_RAE (mcg)'].toFixed(2);
    document.getElementById('currentMealVitdmcg').value = dailyTotalNutrients['VITD (mcg)'].toFixed(2);
    document.getElementById('currentMealThiamg').value = dailyTotalNutrients['THIA (mg)'].toFixed(2);
    document.getElementById('currentMealRibfmg').value = dailyTotalNutrients['RIBF (mg)'].toFixed(2);
    document.getElementById('currentMealNiamg').value = dailyTotalNutrients['NIA (mg)'].toFixed(2);
    document.getElementById('currentMealPantacmg').value = dailyTotalNutrients['PANTAC (mg)'].toFixed(2);
    document.getElementById('currentMealVitb6mg').value = dailyTotalNutrients['VITB6 (mg)'].toFixed(2);
    document.getElementById('currentMealFolmcg').value = dailyTotalNutrients['FOL (mcg)'].toFixed(2);

    // 폼 제출
    document.getElementById('chartForm').submit();
}



