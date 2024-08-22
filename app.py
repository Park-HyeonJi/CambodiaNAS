from flask import Flask, render_template, redirect, url_for, request, jsonify, send_file
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
import pandas as pd
import numpy as np
import os
import logging
from logging.handlers import RotatingFileHandler
from io import BytesIO

app = Flask(__name__)
app.secret_key = 'your_secret_key'

# 엑셀 파일 경로 설정
EXCEL_FILE_PATH = './data/group_user_data.xlsx'
food_data_path = 'data/FoodData.xlsx'
user_data_path = 'data/Test_SaveUserData.xlsx'

# 로깅 설정
# handler = RotatingFileHandler('error.log', maxBytes=10000, backupCount=1)
# handler.setLevel(logging.ERROR)
# app.logger.addHandler(handler)

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
        return redirect(url_for('m_gandu'))  # 기본 페이지를 m_gandu로 변경
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if username in users and users[username]['password'] == password:
            user = User(username)
            login_user(user)
            return redirect(url_for('m_gandu'))  # 로그인 후 m_gandu로 리다이렉트

        return redirect(url_for('login'))
    
    return render_template('login.html')

@app.route('/m-gandu')
@login_required
def m_gandu():
    return render_template('m_gandu.html')

@app.route('/get_groups', methods=['GET'])
@login_required
def get_groups():
    try:
        groups_df, _ = load_excel_data()

        # 설명 필드가 비어 있는 경우 빈 문자열로 대체
        groups_df['description'] = groups_df['description'].fillna('')

        groups = groups_df.to_dict(orient='records')
        return jsonify(groups)
    except Exception as e:
        app.logger.error(f"Error in get_groups: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/save_group', methods=['POST'])
@login_required
def save_group():
    try:
        data = request.get_json()
        group_name = data.get('name', '')
        group_desc = data.get('description', '')

        # app.logger.info(f"Received group name: {group_name}, description: {group_desc}")

        groups_df, users_df = load_excel_data()

        if group_name in groups_df['name'].values:
            # 그룹 정보 업데이트
            groups_df.loc[groups_df['name'] == group_name, 'description'] = group_desc
            # app.logger.info(f"Updated group description for {group_name}")
        else:
            # 그룹이 존재하지 않으면 새 그룹 추가
            new_group = pd.DataFrame({'name': [group_name], 'description': [group_desc]})
            groups_df = pd.concat([groups_df, new_group], ignore_index=True)
            app.logger.info(f"Added new group {group_name}")

        save_excel_data(groups_df, users_df)
        app.logger.info(f"Group data saved successfully for {group_name}")
        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in save_group: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/delete_group', methods=['POST'])
@login_required
def delete_group():
    try:
        data = request.get_json()
        group_name = data['name']

        # 엑셀에서 그룹과 사용자 데이터를 로드
        groups_df, users_df = load_excel_data()

        # 그룹 삭제
        groups_df = groups_df[groups_df['name'] != group_name]

        # 해당 그룹의 모든 사용자 데이터 삭제
        users_df = users_df[users_df['group'] != group_name]

        # 수정된 데이터를 다시 엑셀 파일에 저장
        save_excel_data(groups_df, users_df)

        app.logger.info(f"Group {group_name} and its users deleted successfully.")
        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in delete_group: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/get_users', methods=['GET'])
@login_required
def get_users():
    try:
        group_name = request.args.get('group')
        _, users_df = load_excel_data()
        
        users = users_df[users_df['group'] == group_name].to_dict(orient='records')
        return jsonify(users)
    except Exception as e:
        app.logger.error(f"Error in get_users: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/save_user', methods=['POST'])
@login_required
def save_user():
    try:
        data = request.get_json()
        groups_df, users_df = load_excel_data()

        user_id = str(data['id'])  # ID를 문자열로 변환
        user_group = data['group']

        # 그룹과 아이디를 함께 사용하여 사용자 식별
        existing_user = users_df[(users_df['id'].astype(str) == user_id) & (users_df['group'] == user_group)]

        if not existing_user.empty:
            # 기존 사용자의 정보 업데이트
            app.logger.info(f"Updating existing user with ID: {user_id} in group: {user_group}")
            users_df.loc[(users_df['id'].astype(str) == user_id) & (users_df['group'] == user_group),
                         ['name', 'gender', 'age', 'height', 'weight']] = \
                [data['name'], data['gender'], data['age'], data['height'], data['weight']]
        else:
            app.logger.info(f"Adding new user with ID: {user_id} in group: {user_group}")
            # 새 사용자 추가
            new_user = pd.DataFrame([data])
            users_df = pd.concat([users_df, new_user], ignore_index=True)

        save_excel_data(groups_df, users_df)
        app.logger.info(f"User data saved successfully for ID: {user_id} in group: {user_group}")
        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in save_user: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/delete_user', methods=['POST'])
@login_required
def delete_user():
    try:
        data = request.get_json()
        user_id = str(data['id'])  # ID를 문자열로 변환
        user_group = data['group']

        groups_df, users_df = load_excel_data()

        # 삭제 이전 데이터 상태를 로그로 확인
        app.logger.info(f"Before deletion, users: {users_df.to_dict(orient='records')}")

        # 그룹과 아이디를 함께 사용하여 사용자 삭제
        users_df = users_df[~((users_df['id'].astype(str) == user_id) & (users_df['group'] == user_group))]

        # 삭제 이후 데이터 상태를 로그로 확인
        app.logger.info(f"After deletion, users: {users_df.to_dict(orient='records')}")

        save_excel_data(groups_df, users_df)
        app.logger.info(f"User with ID: {user_id} from group: {user_group} deleted successfully.")
        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in delete_user: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
    
@app.route('/download_excel', methods=['GET'])
@login_required
def download_excel():
    group_name = request.args.get('group')
    
    # 데이터 로드
    _, users_df = load_excel_data()
    
    # 선택된 그룹의 사용자 데이터 필터링
    group_users = users_df[users_df['group'] == group_name]
    
    # 'group' 레이블 제외
    group_users = group_users.drop(columns=['group'])
    
    # 엑셀 파일로 변환
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        group_users.to_excel(writer, index=False)
    
    output.seek(0)
    
    # 엑셀 파일 전송
    return send_file(output, download_name=f'{group_name}_users.xlsx', as_attachment=True)


def load_excel_data():
    # 엑셀 파일에서 그룹과 사용자 데이터를 읽어옴
    xls = pd.ExcelFile(EXCEL_FILE_PATH)
    groups_df = pd.read_excel(xls, 'Group')
    users_df = pd.read_excel(xls, 'Users')

    # app.logger.info(f"Loaded groups: {groups_df.to_dict(orient='records')}")
    # app.logger.info(f"Loaded users: {users_df.to_dict(orient='records')}")

    return groups_df, users_df

def save_excel_data(groups_df, users_df):
    with pd.ExcelWriter(EXCEL_FILE_PATH, engine='openpyxl') as writer:
        groups_df.to_excel(writer, sheet_name='Group', index=False)
        users_df.to_excel(writer, sheet_name='Users', index=False)

@app.route('/24h')
@login_required
def tfh():
    return render_template('24h.html')

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
@login_required
def add_ingredientDB():
    try:
        data = request.get_json()
        INGID = data.get('INGID')
        FOODID = data.get('FOODID')
        FOODNAME = data.get('FOODNAME')  # 클라이언트로부터 받은 FOODNAME
        
        # 새로운 데이터를 포함하는 행 생성
        new_row = {
            'FOODID': FOODID,
            'FOODNAME': FOODNAME,  # 데이터베이스에 FOODNAME 추가
            'INGID': INGID,
            'INGNAME_EN': data.get('INGNAME_EN'),
            '1 person (g)': data.get('1 person (g)'),
            'Energy': data.get('Energy'),
            'Water': data.get('Water'),
            'Protein': data.get('Protein'),
            'Fat': data.get('Fat'),
            'Carbo': data.get('Carbo'),
            'Fiber': data.get('Fiber'),
            'CA': data.get('CA'),
            'FE': data.get('FE'),
            'ZN': data.get('ZN'),
            'VA': data.get('VA'),
            'VB1': data.get('VB1'),
            'VB2': data.get('VB2'),
            'VB3': data.get('VB3'),
            'VB6': data.get('VB6'),
            'Fol': data.get('Fol'),
            'VB12': data.get('VB12'),
            'VC': data.get('VC'),
            'VD': data.get('VD'),
            'NA': data.get('NA')
        }

        # 엑셀 파일 업데이트
        food_data_path = 'data/FoodData.xlsx'
        df = pd.read_excel(food_data_path)
        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        df.to_excel(food_data_path, index=False)

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in add_ingredientDB: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


import numpy as np

@app.route('/get_ingredient_details', methods=['GET'])
@login_required
def get_ingredient_details():
    ingid = request.args.get('INGID')

    if not ingid:
        return jsonify({'status': 'error', 'message': 'INGID is required'}), 400

    try:
        food_data_path = 'data/FoodData.xlsx'
        df = pd.read_excel(food_data_path)

        # INGID만을 기반으로 행 필터링
        filtered_df = df[df['INGID'] == ingid]

        if filtered_df.empty:
            return jsonify({'status': 'error', 'message': 'No ingredient found for the specified INGID'}), 404

        # 첫 번째 일치 항목을 선택
        ingredient = filtered_df.iloc[0].to_dict()

        # NaN 값을 None 또는 0으로 변환
        for key, value in ingredient.items():
            if isinstance(value, float) and np.isnan(value):
                ingredient[key] = None  # 또는 0으로 변경할 수 있습니다.

        return jsonify({'status': 'success', 'ingredient': ingredient})
    except FileNotFoundError:
        return jsonify({'status': 'error', 'message': 'Data file not found'}), 500
    except Exception as e:
        app.logger.error(f"Error in get_ingredient_details: {e}")
        return jsonify({'status': 'error', 'message': f'Unexpected error: {str(e)}'}), 500


@app.route('/search_ingredientDBN', methods=['POST'])
def search_ingredientDBN():
    try:
        data = request.get_json()
        search_type = data['searchType']
        search_value = data['searchValue'].strip().lower()  # 검색어의 공백 제거 및 소문자로 변환

        food_data_path = 'data/FoodData.xlsx'
        food_data = pd.read_excel(food_data_path)

        # INGID 및 INGNAME_EN 열에 NaN 값을 포함한 행을 제거
        food_data = food_data.dropna(subset=['INGID', 'INGNAME_EN'])

        # INGNAME_EN 및 INGID 열을 문자열로 변환 및 공백 제거
        food_data['INGNAME_EN'] = food_data['INGNAME_EN'].astype(str).str.strip()
        food_data['INGID'] = food_data['INGID'].astype(str).str.strip()

        # 'N/A' 값을 포함한 행을 제거
        food_data = food_data[(food_data['INGID'] != 'N/A') & (food_data['INGNAME_EN'] != 'N/A')]

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


@app.route('/get_nutrientDBN', methods=['GET'])
def get_nutrientDBN():
    try:
        ing_id = request.args.get('INGID')
        
        if ing_id is None:
            raise ValueError('INGID parameter is missing')
        
        # 데이터 파일에서 영양소 정보를 로드합니다.
        food_data_path = 'data/FoodData.xlsx'
        food_data = pd.read_excel(food_data_path)

        # 'INGID'가 문자열일 경우
        nutrient_data = food_data[food_data['INGID'].astype(str) == ing_id]

        # NaN 값을 'N/A'로 대체
        nutrient_data = nutrient_data.fillna('N/A')
        
        if not nutrient_data.empty:
            # 영양소 데이터만 반환
            nutrient_data_json = nutrient_data.iloc[0].to_dict()
            return jsonify(nutrient_data_json)
        else:
            return jsonify({})  # 빈 객체 반환

    except Exception as e:
        app.logger.error(f"Error in get_nutrient_data: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/add_ingredientDBN', methods=['POST'])
def add_ingredientDBN():
    try:
        data = request.get_json()
        INGID = data['INGID']
        INGNAME_EN = data['INGNAME_EN']
        person_g = data.get('1 person (g)', 100)  # 사용자가 입력하지 않으면 기본값 100

        # 엑셀 파일 경로 설정
        food_ingredient_data_path = 'data/FoodData.xlsx'
        temp_food_ingredient_data_path = 'data/FoodData_temp.xlsx'

        # 기존 엑셀 파일 로드
        food_ingredient_data = pd.read_excel(food_ingredient_data_path)

        # 새로운 행을 NaN이 아닌 실제 값으로 삽입
        new_row = {col: None for col in food_ingredient_data.columns}  # 기본값 None 설정
        new_row['FOODID'] = INGID
        new_row['CLASS'] = None  # CLASS 필드를 null로 처리
        new_row['FOODNAME'] = INGNAME_EN
        new_row['INGID'] = INGID
        new_row['INGNAME'] = None  # INGNAME 필드를 null로 처리
        new_row['INGNAME_EN'] = INGNAME_EN
        new_row['INGNAME_SC'] = None  # INGNAME_SC 필드를 null로 처리
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
    
@app.route('/edit_ingredientDBN', methods=['POST'])
@login_required
def edit_ingredientDBN():
    try:
        data = request.get_json()
        original_INGID = data.get('original_INGID')
        new_INGID = data.get('new_INGID')
        INGNAME_EN = data.get('INGNAME_EN')

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

        # 각 행에 대해 업데이트 수행
        for idx in matching_rows.index:
            if str(df.at[idx, 'FOODID']) == str(original_INGID):
                df.at[idx, 'FOODID'] = new_INGID
                df.at[idx, 'FOODNAME'] = INGNAME_EN
                df.at[idx, 'INGID'] = new_INGID
                df.at[idx, 'INGNAME_EN'] = INGNAME_EN
            else:
                df.at[idx, 'INGID'] = new_INGID
                df.at[idx, 'INGNAME_EN'] = INGNAME_EN

        # 엑셀 파일에 저장
        df.to_excel(food_ingredient_data_path, index=False)

        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/delete_ingredientDBN', methods=['POST'])
@login_required
def delete_ingredientDBN():
    try:
        data = request.get_json()
        app.logger.debug(f"Received data: {data}")

        food_ingredient_data_path = 'data/FoodData.xlsx'

        INGIDs = data.get('INGIDs')
        app.logger.debug(f"INGIDs: {INGIDs}")

        # 엑셀 파일 읽기
        df = pd.read_excel(food_ingredient_data_path)
        
        if not INGIDs:
            return jsonify({'status': 'error', 'message': 'No INGIDs provided'}), 400

        # 삭제할 행을 찾고 삭제
        rows_to_delete = df[df['INGID'].astype(str) == INGIDs]
        if rows_to_delete.empty:
            return jsonify({'status': 'error', 'message': 'FOODID not found'}), 404

        df = df[df['INGID'].astype(str) != INGIDs]


        # 수정된 데이터프레임을 다시 엑셀에 저장
        df.to_excel(food_ingredient_data_path, index=False)

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in delete_ingredientDB: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/update_nutrient/<ingid>', methods=['POST'])
def update_nutrient(ingid):
    FOOD_INGREDIENT_DATA_PATH = 'data/FoodData.xlsx'
    try:
        data = request.get_json()
        df = pd.read_excel(FOOD_INGREDIENT_DATA_PATH)

        # 엑셀 열 이름과 JSON 키 값의 매핑
        column_mapping = {
            'energy': 'Energy',
            'water': 'Water',
            'protein': 'Protein',
            'fat': 'Fat',
            'carbo': 'Carbo',
            'fiber': 'Fiber',
            'ca': 'CA',
            'fe': 'FE',
            'zn': 'ZN',
            'va': 'VA',
            'vb1': 'VB1',
            'vb2': 'VB2',
            'vb3': 'VB3',
            'vb6': 'VB6',
            'fol': 'Fol',
            'vb12': 'VB12',
            'vc': 'VC',
            'vd': 'VD',
            'na': 'NA',  # 공백을 포함한 열 이름
        }

        update_condition = (df['INGID'].astype(str) == str(ingid))

        if update_condition.any():
            for key, value in data.items():
                if key in column_mapping:  # 매핑된 열 이름으로 업데이트
                    df.loc[update_condition, column_mapping[key]] = value

            df.to_excel(FOOD_INGREDIENT_DATA_PATH, index=False)
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'message': 'No matching entry found'}), 404
    except Exception as e:
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
        food_id = data.get('FOODID')
        new_person_g = float(data.get('person_g'))

        food_data_path = 'data/FoodData.xlsx'
        df = pd.read_excel(food_data_path)

        # 특정 FOODID와 INGID에 해당하는 행 필터링
        update_condition = (df['FOODID'].astype(str) == str(food_id)) & (df['INGID'].astype(str) == str(original_INGID))

        if update_condition.sum() == 0:
            return jsonify({'status': 'error', 'message': 'No matching entry found to update'}), 404

        original_person_g = float(df.loc[update_condition, '1 person (g)'].values[0])
        scaleFactor = new_person_g / original_person_g

        # 각 성분 값들을 업데이트
        for column in ['Energy', 'Water', 'Protein', 'Fat', 'Carbo', 'Fiber', 'CA', 'FE', 'ZN', 'VA', 'VB1', 'VB2', 'VB3', 'VB6', 'Fol', 'VB12', 'VC', 'VD', 'NA']:
            df.loc[update_condition, column] = df.loc[update_condition, column] * scaleFactor

        # INGNAME_EN 및 1 person (g) 값 업데이트
        df.loc[update_condition, 'INGID'] = new_INGID
        df.loc[update_condition, 'INGNAME_EN'] = data.get('INGNAME_EN')
        df.loc[update_condition, '1 person (g)'] = new_person_g

        # 엑셀 파일에 저장
        df.to_excel(food_data_path, index=False)

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in edit_ingredientDB: {e}")
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


# 재료 코드
@app.route('/get_ingredientsDB', methods=['GET'])
@login_required
def get_ingredientsDB():
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


### 음식 검색
@app.route('/search_food', methods=['POST'])
@login_required
def search_food():
    try:
        data = request.get_json()
        search_type = data['searchType']
        search_value = data['searchValue']
        
        # 엑셀 데이터 읽기
        food_data = pd.read_excel(food_data_path)
        
        if search_type == "code":
            results = food_data[food_data['FOODID'].astype(str).str.contains(search_value, na=False, case=False)]
        else:
            results = food_data[food_data['FOODNAME'].str.contains(search_value, na=False, case=False)]
        
        results = results.drop_duplicates(subset=['FOODID', 'FOODNAME', 'INGID'])
        results = results[['FOODID', 'FOODNAME', 'INGID']]
        
        return jsonify(results.to_dict(orient='records'))
    except Exception as e:
        app.logger.error(f"Error in search_food: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

### 음식 추가
@app.route('/add_food', methods=['POST'])
@login_required
def add_food():
    try:
        data = request.get_json()
        food_code = data['foodCode']
        food_name = data['foodName']
        time_category = data['timeCategory']
        user_group = data['userGroup']
        user_id = data['userID']
        view_date = data['viewDate']

        food_data = pd.read_excel(food_data_path)
        selected_food_data = food_data[food_data['FOODID'] == food_code].copy()

        if selected_food_data.empty:
            app.logger.error(f"No data found for foodCode: {food_code}")
            return jsonify({'status': 'error', 'message': f"No data found for foodCode: {food_code}"}), 400

        # 사용자 정보 추가 (userGroup, userID, viewDate, timeCategory)
        selected_food_data['USERID'] = user_id
        selected_food_data['USERGROUP'] = user_group
        selected_food_data['DATE'] = view_date
        selected_food_data['TIME'] = time_category

        # 확인용 디버깅 로그 추가
        app.logger.debug(f"selected_food_data after adding user info: {selected_food_data}")
        
        # 기존 사용자 데이터를 불러와서 새로운 데이터를 추가
        existing_data = pd.read_excel(user_data_path)
        # 데이터프레임 결합
        updated_data = pd.concat([existing_data, selected_food_data], ignore_index=True)

        save_user_data(updated_data)

        return jsonify({'status': 'success'})
    except Exception as e:
        app.logger.error(f"Error in add_food: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

### 유저 음식 기록 저장
def save_user_data(updated_data):
    # 기존 데이터 로드
    # if os.path.exists(user_data_path):
    #     existing_data = pd.read_excel(user_data_path)
    # else:
    #     existing_data = pd.DataFrame()

    # 새로운 데이터와 기존 데이터 병합
    # updated_data = pd.concat([existing_data, new_data], ignore_index=True)

    # 병합된 데이터를 엑셀 파일에 저장
    updated_data.to_excel(user_data_path, index=False)

### 음식 리스트 조회
@app.route('/get_food_list', methods=['GET'])
@login_required
def get_food_list():
    try:
        user_group = request.args.get('userGroup')
        user_id = request.args.get('userID')
        view_date = request.args.get('viewDate')

        user_data = load_user_data(user_group, user_id, view_date)
        result = user_data.to_dict(orient='records')

        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error in get_food_list: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

### 유저 음식 기록 조회
def load_user_data(user_group, user_id, view_date):
    if os.path.exists(user_data_path):
        user_data = pd.read_excel(user_data_path)

        # 특정 유저 ID와 날짜로 필터링
        if user_id and view_date:
            user_data = user_data[(user_data['USERID'].astype(str) == user_id) & (user_data['DATE'].astype(str) == view_date)]
        else:
            # 시트가 없을 경우 빈 데이터프레임 반환
            user_data = pd.DataFrame()
    app.logger.debug(f"load_user_data: {user_data}")
    return user_data

### 재료 리스트 조회
@app.route('/get_ingredients', methods=['POST'])
@login_required
def get_ingredients():
    try:
        data = request.get_json()
        food_codes = data['foodCode']

        if not isinstance(food_codes, list):
            food_codes = [food_codes]

        food_data = pd.read_excel(food_data_path)
        
        ingredient_codes = []
        for food_code in food_codes:
            ingredients = food_data[food_data['FOODID'] == food_code]['INGID'].tolist()
            ingredient_codes.extend(ingredients)
        
        return jsonify(ingredient_codes)
    except Exception as e:
        app.logger.error(f"Error in get_ingredients: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# 영양 성분
@app.route('/get_nutrition', methods=['POST'])
@login_required
def get_nutrition():
    try:
        data = request.get_json()
        food_code = data['foodCode']
        ingredient_codes = data['ingredientCodes']

        nutrition_data = pd.read_excel(food_data_path)
        
        nutrition_info = nutrition_data[
            (nutrition_data['FOODID'] == food_code) & 
            (nutrition_data['INGID'].isin(ingredient_codes))
        ]
        nutrition_info = nutrition_info.replace({np.nan: 0}) # NaN 값을 0으로 대체
        nutrition_info = nutrition_info.to_dict(orient='records')
        
        # app.logger.debug(f"nutrition_info: {nutrition_info}")
        return jsonify(nutrition_info)
    except Exception as e:
        app.logger.error(f"Error in get_nutrition: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/get_food_ingredients', methods=['GET'])
@login_required
def get_food_ingredients():
    try:
        food_code = request.args.get('foodCode')

        # 데이터 파일에서 음식 재료를 로드합니다.
        food_data = pd.read_excel(food_data_path)

        ingredients = food_data[food_data['FOODID'] == food_code].to_dict(orient='records')
        return jsonify(ingredients)
    except Exception as e:
        app.logger.error(f"Error in get_food_ingredients: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/download_nutrition', methods=['POST'])
def download_nutrition():
    try:
        data = request.json.get('data', [])
        user_name = request.json.get('userName', 'user')

        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400
        
        # 데이터를 DataFrame으로 변환
        df = pd.DataFrame(data[1:], columns=data[0])

        # 엑셀 파일을 메모리에 생성
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False)

        output.seek(0)

        filename = f'nutritional_information_{user_name}.xlsx'
        # 엑셀 파일을 클라이언트로 반환
        return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                         as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/get_user_info', methods=['GET'])
def get_user_info():
    try:
        user_group = request.args.get('userGroup')
        user_id = request.args.get('userID')

        _, users_df = load_excel_data()

        user_info = users_df[(users_df['group'] == user_group) & (users_df['id'] == int(user_id))]
        result = user_info.to_dict(orient='records')[0]

        return jsonify(result)
    except Exception as e:
            app.logger.error(f"Error in get_user_info: {e}")
            return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/runchart', methods=['POST'])
def run_python_code():
    from bar import bar;

    current_meal_data = {
        'Energy': request.form.get('currentMealEnergy'),
        'Protein': request.form.get('currentMealProtein'),
        'CA': request.form.get('currentMealCA'),
        'FE': request.form.get('currentMealFE'),
        'ZN': request.form.get('currentMealZN'),
        'VA': request.form.get('currentMealVA'),
        'VB1': request.form.get('currentMealVB1'),
        'VB2': request.form.get('currentMealVB2'),
        'VB': request.form.get('currentMealVB3'),
        'Fol': request.form.get('currentMealFol'),
        'VC': request.form.get('currentMealVC'),
        'VD': request.form.get('currentMealVD'),
        'NA': request.form.get('currentMealNA'),
    }
    
    gender = request.form.get('userGender')
    age = request.form.get('userAge')

    result = bar(current_meal_data, gender, age) 

    return render_template('24h_chart.html', result=result)


# 로그아웃
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
