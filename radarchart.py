from pyecharts import options as opts
from pyecharts.charts import Radar
from pyecharts.globals import ThemeType

def radarchart(current_meal_data):
    # Create the schema for the radar chart
    schema = [
        opts.RadarIndicatorItem(name="Energy (100 kcal)", max_=100),
        opts.RadarIndicatorItem(name="Carbohydrate (300 g)", max_=300),
        opts.RadarIndicatorItem(name="Fat (100 g)", max_=100),
        opts.RadarIndicatorItem(name="Protein (100 g)", max_=100),
        opts.RadarIndicatorItem(name="Vitamins (100 mg)", max_=100),
    ]
    
    # Create the data
    
    values = [
        [70, 200, 80, 50, 30],  # Example data for subject 1
        [90, 220, 70, 50, 45],  # Example data for subject 2
    ]
    
    valuelist=[]
    v=[0,5,4,3,11]; 
    for x in v:
        value=list(current_meal_data.values())
        if value[x]=='':
            valuelist.append(0.0)
        else:
            valuelist.append(float(value[x]))
    values[1]=valuelist

    # Initialize the radar chart
    radar = Radar(init_opts=opts.InitOpts(theme=ThemeType.LIGHT))
    
    # Add the schema
    radar.add_schema(schema=schema)
    
    # Add the data to the radar chart
    radar.add(
        series_name="Current",
        data=[values[0]],
        linestyle_opts=opts.LineStyleOpts(color="yellow"),
    )
    radar.add(
        series_name="Target",
        data=[values[1]],
        linestyle_opts=opts.LineStyleOpts(color="blue"),
    )
    
    # Set global options
    radar.set_global_opts(
        title_opts=opts.TitleOpts(title="Major Nutritional Values Radar Chart"),
        legend_opts=opts.LegendOpts(),
    )
    
    # Render the chart to a file
    radar.render("./templates/radarchart.html")
