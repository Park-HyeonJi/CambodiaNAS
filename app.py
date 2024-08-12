from flask import Flask, render_template, redirect, url_for, request, jsonify, make_response
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import pandas as pd
import numpy as np
import os
import logging
from logging.handlers import RotatingFileHandler
from barchart import barchart;

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# 로깅 설정
handler = RotatingFileHandler('error.log', maxBytes=10000, backupCount=1)
handler.setLevel(logging.ERROR)
app.logger.addHandler(handler)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

users = {'ddd': {'password': 'password'}}

class User(UserMixin):
    def __init__(self, id):
        self.id = id

    def get_id(self):
        return self.id

@login_manager.user_loader
def load_user(user_id):
    return User(user_id)

@app.route('/')
def base():
    if current_user.is_authenticated:
        return redirect(url_for('m_group'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if username in users and users[username]['password'] == password:
            user = User(username)
            login_user(user)
            return redirect(url_for('m_group'))

        return redirect(url_for('login'))
    
    return render_template('login.html')

@app.route('/m-group')
@login_required
def m_group():
    return render_template('m_group.html')

@app.route('/m-person')
@login_required
def m_person():
    return render_template('m_person.html')

@app.route('/24h')
@login_required
def tfh():
    return render_template('24h.html')

@app.route('/24h-stas')
@login_required
def tfh_stas():
    return render_template('24h_stas.html')

@app.route('/24h-excel')
@login_required
def tfh_excel():
    return render_template('24h_excel.html')

@app.route('/db-food')
@login_required
def db_food():
    return render_template('db_food.html')

@app.route('/db-nutri')
@login_required
def db_nutri():
    return render_template('db_nutri.html')

@app.route('/search_foodDB', methods=['POST'])
@login_required
def search_foodDB():
    try:
        data = request.get_json()
        search_type = data['searchType']
        search_value = data['searchValue'].strip().lower()  # 검색어의 공백 제거 및 소문자로 변환
        
        food_data_path = 'data/FoodData.xlsx'
        food_data = pd.read_excel(food_data_path)

        # FOODNAME 및 FOODID 열을 문자열로 변환
        food_data['FOODNAME'] = food_data['FOODNAME'].astype(str).str.strip()
        food_data['FOODID'] = food_data['FOODID'].astype(str).str.strip()

        if search_type == "code":
            # 'search_value'가 FOODID에 포함되는 모든 행을 검색 (검색용으로만 소문자 변환)
            results = food_data[food_data['FOODID'].str.lower().str.contains(search_value, case=False, na=False)]
        else:
            # 'search_value'가 FOODNAME에 포함되는 모든 행을 검색 (검색용으로만 소문자 변환)
            results = food_data[food_data['FOODNAME'].str.lower().str.contains(search_value, case=False, na=False)]
        
        results = results.fillna('N/A')
        results = results.drop_duplicates(subset=['FOODID', 'FOODNAME'])
        results = results[['FOODID', 'FOODNAME']]
        
        # 결과가 없을 경우 빈 리스트 반환
        result_list = results.to_dict(orient='records')
        if not result_list:
            app.logger.info("No results found for search.")
            return jsonify([])  # 빈 리스트 반환
        
        # 결과를 리스트 형식으로 반환
        return jsonify(result_list)
    
    except Exception as e:
        app.logger.error(f"Error in search_food: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/search_ingredientDB', methods=['POST'])
def search_ingredientDB():
    try:
        data = request.get_json()
        search_type = data['searchType']
        search_value = data['searchValue'].strip().lower()  # 검색어의 공백 제거 및 소문자로 변환
        
        food_data_path = 'data/FoodData.xlsx'
        food_data = pd.read_excel(food_data_path)

        # INGNAME_EN 및 INGID 열을 문자열로 변환
        food_data['INGNAME_EN'] = food_data['INGNAME_EN'].astype(str).str.strip()
        food_data['INGID'] = food_data['INGID'].astype(str).str.strip()

        if search_type == "ingredientCode":
            # 'search_value'가 INGID에 포함되는 모든 행을 검색
            results = food_data[food_data['INGID'].str.lower().str.contains(search_value, case=False, na=False)]
        else:
            # 'search_value'가 INGNAME_EN에 포함되는 모든 행을 검색
            results = food_data[food_data['INGNAME_EN'].str.lower().str.contains(search_value, case=False, na=False)]
        
        results = results.fillna('N/A')
        results = results.drop_duplicates(subset=['INGID', 'INGNAME_EN'])
        results = results[['INGID', 'INGNAME_EN', '1 person (g)']]
        
        # 결과가 없을 경우 빈 리스트 반환
        result_list = results.to_dict(orient='records')
        if not result_list:
            app.logger.info("No results found for search.")
            return jsonify([])  # 빈 리스트 반환
        
        # 결과를 리스트 형식으로 반환
        return jsonify(result_list)
    
    except Exception as e:
        app.logger.error(f"Error in search_ingredient: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/get_food_ingredientsDB', methods=['GET'])
def get_food_ingredientsDB():
    try:
        food_code = request.args.get('FOODID')
        
        if food_code is None:
            raise ValueError('FOODID parameter is missing')
        
        # 데이터 파일에서 음식 재료를 로드합니다.
        food_data_path = 'data/FoodData.xlsx'
        food_data = pd.read_excel(food_data_path)

        # 'FOODID'가 문자열일 경우
        ingredients = food_data[food_data['FOODID'].astype(str) == food_code]

        # NaN 값을 'N/A'로 대체
        ingredients = ingredients.fillna('N/A')
        ingredients = ingredients.drop_duplicates(subset=['INGID', 'INGNAME_EN'])

        # JSON으로 변환
        ingredients_json = ingredients.to_dict(orient='records')

        return jsonify(ingredients_json)
    except Exception as e:
        app.logger.error(f"Error in get_food_ingredients: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# DB 편집용_addfood
@app.route('/add_foodDB', methods=['POST'])
@login_required
def add_foodDB():
    try:
        data = request.get_json()
        FOODID = data['FOODID']
        FOODNAME = data['FOODNAME']

        # 엑셀 파일 경로 설정
        food_data_path = 'data/FoodData.xlsx'
        temp_food_data_path = 'data/FoodData_temp.xlsx'

        # 기존 엑셀 파일 로드
        if not os.path.exists(food_data_path):
            return jsonify({'status': 'error', 'message': 'Data file not found'}), 404
        
        food_data = pd.read_excel(food_data_path)
        
        # 중복 체크
        if FOODID in food_data['FOODID'].values:
            return jsonify({'status': 'error', 'message': 'FOODID already exists'}), 400
        if FOODNAME in food_data['FOODNAME'].values:
            return jsonify({'status': 'error', 'message': 'FOODNAME already exists'}), 400

        # 새로운 행을 기본값 'N/A'로 초기화
        new_row = {col: 'N/A' for col in food_data.columns}
        new_row['FOODID'] = FOODID
        new_row['FOODNAME'] = FOODNAME
        
        # 새로운 행을 DataFrame으로 변환
        new_row_df = pd.DataFrame([new_row])
        
        # DataFrame에 새로운 행 추가
        food_data = pd.concat([food_data, new_row_df], ignore_index=True)

        # 엑셀 파일에 저장 (임시 파일 사용)
        food_data.to_excel(temp_food_data_path, index=False)

        # 임시 파일을 실제 파일로 덮어쓰기
        os.replace(temp_food_data_path, food_data_path)

        return jsonify({'status': 'success', 'message': 'Food added successfully'})
    except Exception as e:
        app.logger.error(f"Error in add_foodDB: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/add_ingredientDB', methods=['POST'])
def add_ingredientDB():
    try:
        data = request.get_json()
        INGID = data['INGID']
        INGNAME_EN = data['INGNAME_EN']
        person_g = data['1 person (g)']
        FOODID = data.get('FOODID')  # FOODID는 선택적
        FOODNAME = data.get('FOODNAME')  # FOODNAME도 선택적

        # 엑셀 파일 경로 설정
        food_ingredient_data_path = 'data/FoodData.xlsx'
        temp_food_ingredient_data_path = 'data/FoodData_temp.xlsx'

        # 기존 엑셀 파일 로드
        food_ingredient_data = pd.read_excel(food_ingredient_data_path)

        # 동일한 FOODID와 FOODNAME을 가지고 있지만 INGID, INGNAME_EN, 1 person (g)이 NaN인 행 삭제
        delete_condition = (
            (food_ingredient_data['FOODID'] == FOODID) &
            (food_ingredient_data['FOODNAME'] == FOODNAME) &
            (pd.isna(food_ingredient_data['INGID'])) &
            (pd.isna(food_ingredient_data['INGNAME_EN'])) &
            (pd.isna(food_ingredient_data['1 person (g)']))
        )
        # 조건을 만족하는 행 삭제
        food_ingredient_data = food_ingredient_data[~delete_condition]

        # 중복 체크
        if FOODID is None:  # FOODID가 선택되지 않았을 때만 INGID의 중복 체크
            if INGID in food_ingredient_data['INGID'].values:
                return jsonify({'status': 'error', 'message': 'INGID already exists'}), 400

        # 새로운 행을 NaN이 아닌 실제 값으로 삽입
        new_row = {col: 'N/A' for col in food_ingredient_data.columns}
        new_row['FOODID'] = FOODID
        new_row['FOODNAME'] = FOODNAME
        new_row['INGID'] = INGID
        new_row['INGNAME_EN'] = INGNAME_EN
        new_row['1 person (g)'] = person_g

        # 새로운 행을 DataFrame으로 변환하고 기존 데이터에 추가
        new_ingredient_df = pd.DataFrame([new_row])
        food_ingredient_data = pd.concat([food_ingredient_data, new_ingredient_df], ignore_index=True)

        # 임시 파일에 저장
        food_ingredient_data.to_excel(temp_food_ingredient_data_path, index=False)

        # 임시 파일을 실제 파일로 덮어쓰기
        os.replace(temp_food_ingredient_data_path, food_ingredient_data_path)

        return jsonify({'status': 'success', 'message': 'Ingredient added successfully'})
    except Exception as e:
        app.logger.error(f"Error in add_ingredientDB: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500



@app.route('/check_ingredientDB', methods=['POST'])
def check_ingredientDB():
    try:
        data = request.get_json()
        INGID = data['INGID']
        INGNAME_EN = data['INGNAME_EN']
        
        # 엑셀 파일 경로 설정
        food_ingredient_data_path = 'data/FoodData.xlsx'
        
        # 기존 엑셀 파일 로드
        food_ingredient_data = pd.read_excel(food_ingredient_data_path)
        
        # NaN 값을 'N/A'로 변환
        food_ingredient_data.fillna('N/A', inplace=True)

        # 조건에 맞는 데이터 필터링
        duplicates  = food_ingredient_data[
            (food_ingredient_data['INGID'] == INGID) | 
            (food_ingredient_data['INGNAME_EN'] == INGNAME_EN)
        ]
        
        # 중복 데이터가 있을 경우 반환
        if not duplicates.empty:
            duplicate_list = duplicates.to_dict(orient='records')
            return jsonify({'status': 'success', 'data': duplicate_list})
        else:
            return jsonify({'status': 'success', 'data': []})
    except Exception as e:
        app.logger.error(f"Error in check_ingredient: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# EditFood
@app.route('/edit_foodDB', methods=['POST'])
@login_required
def edit_foodDB():
    try:
        data = request.get_json()
        new_foodCode = data['foodCode']
        new_foodName = data['foodName']
        original_foodCode = data['originalFoodCode']

        # 엑셀 파일 경로 설정
        food_data_path = 'data/FoodData.xlsx'
        
        # 기존 엑셀 파일 로드
        df = pd.read_excel(food_data_path)

        # 기존 FOODID를 기준으로 데이터 찾기 및 수정
        if original_foodCode in df['FOODID'].values:
            # FOODID와 FOODNAME 수정
            df.loc[df['FOODID'] == original_foodCode, ['FOODID', 'FOODNAME']] = [new_foodCode, new_foodName]
            
            # original_foodCode와 동일한 INGID가 있는 경우 해당 INGID와 INGNAME_EN 수정
            df.loc[df['INGID'] == original_foodCode, ['INGID', 'INGNAME_EN']] = [new_foodCode, new_foodName]
            
            # 수정된 DataFrame을 파일에 저장
            df.to_excel(food_data_path, index=False)
            
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': 'Original FOODID not found'}), 404

    except Exception as e:
        app.logger.error(f"Error in edit_foodDB: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/edit_ingredientDB', methods=['POST'])
@login_required
def edit_ingredientDB():
    try:
        data = request.get_json()
        original_INGID = data.get('original_INGID')
        new_INGID = data.get('new_INGID')
        INGNAME_EN = data.get('INGNAME_EN')
        person_g = data.get('person_g')
        FOODID = data.get('FOODID')

        # 엑셀 파일 로드
        food_ingredient_data_path = 'data/FoodData.xlsx'
        df = pd.read_excel(food_ingredient_data_path)

        # Ensure no NaN values
        df.fillna('', inplace=True)

        # 조건 설정
        update_condition = (df['INGID'].astype(str) == str(original_INGID))

        # 데이터가 존재하는지 확인
        matching_rows = df[update_condition]

        if matching_rows.empty:
            return jsonify({'status': 'error', 'message': 'No matching entry found to update'}), 404

        # 데이터 업데이트 로직
        if FOODID == original_INGID:
            # `original_INGID`와 `FOODID`가 동일한 경우
            df.loc[update_condition, ['INGID', 'FOODID', 'INGNAME_EN', 'FOODNAME']] = [new_INGID, new_INGID, INGNAME_EN, INGNAME_EN]
        else:
            # `original_INGID`와 `FOODID`가 다른 경우
            df.loc[update_condition, ['INGID', 'INGNAME_EN', '1 person (g)']] = [new_INGID, INGNAME_EN, person_g]

        # 엑셀 파일에 저장
        df.to_excel(food_ingredient_data_path, index=False)

        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# Delete Food
@app.route('/delete_foodDB', methods=['POST'])
@login_required
def delete_foodDB():
    try:
        data = request.get_json()
        food_code = data.get('foodCode')

        if not food_code:
            return jsonify({'status': 'error', 'message': 'foodCode is required'}), 400

        # 엑셀 파일 경로 설정
        food_data_path = 'data/FoodData.xlsx'

        # 엑셀 파일 로드
        food_data = pd.read_excel(food_data_path)

        # 'FOODID' 열에서 food_code가 일치하는 행 삭제
        if 'FOODID' not in food_data.columns:
            return jsonify({'status': 'error', 'message': 'FOODID column not found'}), 500

        # 삭제할 행을 찾고 삭제
        rows_to_delete = food_data[food_data['FOODID'].astype(str) == food_code]
        if rows_to_delete.empty:
            return jsonify({'status': 'error', 'message': 'FOODID not found'}), 404

        food_data = food_data[food_data['FOODID'].astype(str) != food_code]

        # 변경된 DataFrame을 엑셀 파일에 저장
        food_data.to_excel(food_data_path, index=False)

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in delete_foodDB: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/delete_ingredientDB', methods=['POST'])
@login_required
def delete_ingredientDB():
    try:
        data = request.get_json()
        app.logger.debug(f"Received data: {data}")

        food_ingredient_data_path = 'data/FoodData.xlsx'

        FOODID = data.get('FOODID')
        INGIDs = data.get('INGIDs', [])
        app.logger.debug(f"FOODID: {FOODID}, INGIDs: {INGIDs}")

        # 엑셀 파일 읽기
        df = pd.read_excel(food_ingredient_data_path)
        
        if not INGIDs:
            return jsonify({'status': 'error', 'message': 'No INGIDs provided'}), 400

        # FOODID와 INGIDs가 일치하는 행을 삭제
        for ingid in INGIDs:
            if FOODID:
                df = df[~((df['FOODID'] == FOODID) & (df['INGID'] == ingid))]
            else:
                df = df[df['INGID'] != ingid]

        # 수정된 데이터프레임을 다시 엑셀에 저장
        df.to_excel(food_ingredient_data_path, index=False)

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in delete_ingredientDB: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/add_food', methods=['POST'])
@login_required
def add_food():
    try:
        data = request.get_json()
        food_code = data['FOODID']
        food_name = data['FOODNAME']
        time_category = data['timeCategory']
        user_group = data['userGroup']
        user_id = data['userID']
        view_date = data['viewDate']

        food_data_path = 'data/FoodData.xlsx'
        food_data = pd.read_excel(food_data_path)
        
        selected_food_data = food_data[food_data['Food Name'] == food_name]

        user_data = load_user_data(user_group, user_id, view_date)
        if time_category not in user_data:
            user_data[time_category] = []
        
        user_data[time_category].extend(selected_food_data.to_dict(orient='records'))
        save_user_data(user_group, user_id, view_date, user_data)

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in add_food: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/get_food_list', methods=['GET'])
@login_required
def get_food_list():
    try:
        user_group = request.args.get('userGroup')
        user_id = request.args.get('userID')
        view_date = request.args.get('viewDate')

        user_data = load_user_data(user_group, user_id, view_date)
        return jsonify(user_data)
    except Exception as e:
        app.logger.error(f"Error in get_food_list: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def load_user_data(user_group, user_id, view_date):
    file_path = f'data/{user_group}_{user_id}_{view_date}.xlsx'
    if os.path.exists(file_path):
        xls = pd.ExcelFile(file_path)
        user_data = {sheet: xls.parse(sheet).to_dict(orient='records') for sheet in xls.sheet_names}
    else:
        user_data = {
            'Breakfast': [],
            'Morning snack': [],
            'Lunch': [],
            'Afternoon Snack': [],
            'Dinner': [],
            'Midnight Snack': []
        }
    return user_data

# 재료 코드
@app.route('/get_ingredientsDB', methods=['GET'])
@login_required
def get_ingredients():
    try:
        ing_id = request.args.get('INGID')  # 쿼리 파라미터에서 INGID를 가져옴

        if ing_id is None:
            raise ValueError("INGID parameter is required")
        
        ing_data_path = 'data/FoodData.xlsx'
        ing_data = pd.read_excel(ing_data_path)

        # INGID가 문자열일 수 있으므로 문자열로 비교
        ingredients = ing_data[ing_data['INGID'].astype(str) == ing_id].to_dict(orient='records')

        if not ingredients:
            return jsonify({'status': 'error', 'message': 'No ingredients found'}), 404

        return jsonify(ingredients)
    except Exception as e:
        app.logger.error(f"Error in get_ingredients: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


# 영양 성분
@app.route('/get_nutrition', methods=['POST'])
@login_required
def get_nutrition():
    try:
        data = request.get_json()
        ingredient_codes = data['ingredientCodes']

        # ingredient_codes가 리스트인지 확인하고, 아니면 리스트로 변환
        if isinstance(ingredient_codes, int):
            ingredient_codes = [ingredient_codes]
        elif not isinstance(ingredient_codes, list):
            ingredient_codes = list(ingredient_codes)
        
        nutrition_data_path = 'data/FoodIngredient_test.xlsx'
        nutrition_data = pd.read_excel(nutrition_data_path)
        
        nutrition_info = nutrition_data[nutrition_data['ID Code'].isin(ingredient_codes)]
        nutrition_info = nutrition_info.replace({np.nan: 0})
        nutrition_info = nutrition_info.to_dict(orient='records')
        
        return jsonify(nutrition_info)
    except Exception as e:
        app.logger.error(f"Error in get_nutrition: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


def save_user_data(user_group, user_id, view_date, data):
    file_path = f'data/{user_group}_{user_id}_{view_date}.xlsx'
    with pd.ExcelWriter(file_path) as writer:
        for sheet_name, records in data.items():
            df = pd.DataFrame(records)
            df.to_excel(writer, sheet_name=sheet_name, index=False)


@app.route('/NutrientIntake')
@login_required
def NutrientIntake():
    return render_template('test1.html')

@app.route('/FoodGroupIntake')
@login_required
def FoodGroupIntake():
    return render_template('test2.html')

# 로그아웃
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)
