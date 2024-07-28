from pyecharts import options as opts
from pyecharts.charts import Radar
from pyecharts.globals import ThemeType

def radarchart(current_meal_data):
    # Create the schema for the radar chart
    schema = [
        opts.RadarIndicatorItem(name="Energy (kcal)", max_=4000),
        opts.RadarIndicatorItem(name="Water (g)", max_=4000),
        opts.RadarIndicatorItem(name="Protein (g)", max_=100),
        opts.RadarIndicatorItem(name="Fat (g)", max_=100),
        opts.RadarIndicatorItem(name="Carbohydrate (g)", max_=150),
    ]
    
    # Create the data    
    values = [
        [0, 0, 0, 0, 0],  # Example data for subject 1
        [3000, 3000, 60, 60, 130],  # Example data for subject 2
    ]
    
    valuelist=[]
    v=[0,2,3,4,5]; 
    for x in v:
        value=list(current_meal_data.values())
        if value[x]=='':
            valuelist.append(1.0)
        else:
            valuelist.append(float(value[x]))
    values[0]=valuelist

    # Initialize the radar chart
    radar = Radar(init_opts=opts.InitOpts(theme=ThemeType.LIGHT))
    
    # Add the schema
    radar.add_schema(schema=schema)
    
    # Add the data to the radar chart
    radar.add(
        series_name="Current",
        data=[values[0]],
        linestyle_opts=opts.LineStyleOpts(color="magenta"),
        label_opts=opts.LabelOpts(is_show=False),  # 레이블 표시 끄기 (필요시)
        color="magenta"  # 범례 색상 강제 설정
    )
    radar.add(
        series_name="Target",
        data=[values[1]],
        linestyle_opts=opts.LineStyleOpts(color="royalblue"),
        label_opts=opts.LabelOpts(is_show=False),  # 레이블 표시 끄기 (필요시)
        color="royalblue"  # 범례 색상 강제 설정
    )    
    
    # Set global options
    radar.set_global_opts(
        title_opts=opts.TitleOpts(title="Radar for 5 Major Nutritional Values"),
        legend_opts=opts.LegendOpts(),
    )
    
    # Render the chart to a file
    radar.render("./templates/radarchart.html")
