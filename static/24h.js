document.addEventListener('DOMContentLoaded', () => {
    loadGroupsForUser();
    toggleInputFields();

    // Breakfast 버튼을 디폴트로 활성화
    const defaultCategory = document.querySelector('.time-categories button[data-category="Breakfast"]');
    setActive(defaultCategory);
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
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format received from server');
        }

         // 데이터 내의 NaN 값을 null로 변환
        // for (let category in data) {
        //     if (data.hasOwnProperty(category)) {
        //         data[category] = data[category].map(food => {
        //             for (let key in food) {
        //                 if (isNaN(food[key])) {
        //                     food[key] = 0; // 또는 원하는 다른 기본값으로 설정
        //                 }
        //             }
        //             return food;
        //         });
        //     }
        // }

        // 기존 데이터를 초기화
        var mealTbody = document.getElementById('nutrition-tbody');
        mealTbody.innerHTML = '';

        var categories = ['Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Midnight Snack'];
        var foods = [];

        categories.forEach(category => {
            if (data[category]) {
                data[category].forEach(food => {
                    //promises.push(loadNutrition(food['Food Code'], food['Food Name'], category));
                    // 중복 제거 부분 수정
                    if (!foods.some(item => item['FOODID'] === food['FOODID'] && item['Category'] === category)) {
                        foods.push({ ...food, 'Category': category });
                    }
                });
            }
        });

        // 각 음식에 대해 loadNutrition을 호출하고 그 결과를 테이블에 추가
        Promise.all(foods.map(food => loadNutrition(food['FOODID'], food['FOODNAME'], food['Category'])))
        .then(results => {
            var totalNutrients = {
                'Energy': 0, 'Water': 0, 'Protein': 0, 'Fat': 0, 
                'Carbo': 0, 'Fiber': 0, 'CA': 0, 'FE': 0, 
                'ZN': 0, 'VA': 0, 'VB1': 0, 'VB2': 0, 'VB3': 0, 'VB6': 0,
                'Fol': 0, 'VB12': 0, 'VC': 0, 'VD': 0, 'NA': 0
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
        })
        .catch(error => {
            console.error('Error processing nutrition data:', error);
            // 필요시 UI에서 사용자에게 오류를 알리거나 오류 처리를 추가
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
                        'Energy': 0, 'Water': 0, 'Protein': 0, 'Fat': 0, 
                        'Carbo': 0, 'Fiber': 0, 'CA': 0, 'FE': 0, 
                        'ZN': 0, 'VA': 0, 'VB1': 0, 'VB2': 0, 'VB3': 0, 'VB6': 0,
                        'Fol': 0, 'VB12': 0, 'VC': 0, 'VD': 0, 'NA': 0
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

            selectedUserId = null;
        })
        .catch(error => console.error('Error loading users:', error));
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
            // loadAllFoodList();
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

        data.forEach(food => {
            if (food['TIME'] === activeCategory && !uniqueFoods.some(item => item['FOODNAME'] === food['FOODNAME'])) {
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
        loadAllFoodList();
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

// 엑셀로 내보내기
function exportExcel() {
    

}

// 차트 생성
function submitChartForm() {
    if (!dailyTotalNutrients) {
        alert('Daily total nutrients not calculated yet.');
        return;
    }

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



