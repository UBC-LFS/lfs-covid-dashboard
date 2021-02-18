import pandas as pd
import os
import sys
import argparse
import json
import xlrd

df = None

parser = argparse.ArgumentParser(description='Process FNH fob data report.')
parser.add_argument('--filepath', type=str, help='File path to the fob data report')
parser.add_argument('--building', type=str, help='Building of the fob data report')
args = parser.parse_args()
filepath = args.filepath
building = args.building

try:
  wb = xlrd.open_workbook(filepath, logfile=open(os.devnull, 'w'))
  df = pd.read_excel(wb, skiprows=5, usecols="F,I,P,R", header=1, parse_dates=['Field-Time'])
except Exception as e:
  print("ERROR: ", e)

# Keywords for removing row in data table
keywordRowsToRemove = ['request', 'closed', 'opened', 'forced', 'not allowed', 'incontrol']

# Specific keywords for removing row in FNH data table
fnhDoorKeywords = ['door 130', 'door 138', 'door 160', 'door 190','door 250', 'door 260', 'door 290', 'door 316', 'door 390', \
  'to 130', 'to 138', 'to 160', 'to 190', 'to 250', 'to 260', 'to 290', 'to 316', 'to 390']

# Return whether we should remove row for FNH data
def shoudRemoveRowFNH(value):
  keywords = keywordRowsToRemove + fnhDoorKeywords
  if(type(value) != str):
    return False
  else:
    value = value.lower()
    return any([ keyword in value for keyword in keywords ])

# Assign IDs to rows with empty User value for counting
df['_id'] = df.index
df['_id'] = df['_id'].apply(str)

# Remove rows with keywords for FNH and empty User rows for MCML
if building == 'fnh':
  df = df[df['Description'].apply(shoudRemoveRowFNH) == False]
  df['User'] = df['User'].fillna(df['_id'])  
else: 
  df.dropna(subset=['User'], inplace=True)

# Get Date value from Field-Time
df['Date'] = df['Field-Time'].dt.date

# Remove rows with duplicating User value
df = df.drop_duplicates(subset='User', keep='first')

# Remove unused columns
df = df.drop(columns=['Description', 'Field-Time', 'User', '_id'])

# Debug line
# print(df['Description'].head(30).values)

# Date parsing helpers
def suffix(d):
  return 'th' if 11<=d<=13 else {1:'st',2:'nd',3:'rd'}.get(d%10, 'th')

def custom_strftime(format, t):
  return t.strftime(format).replace('{S}', str(t.day) + suffix(t.day))

# Get # of entries across different dates
result = df.groupby('Date').count().rename(columns={"Door": "Entry Count"})
indexes = [custom_strftime('%b {S}, %Y', date) for date in list(result.index.values)]
values = [int(value) for value in result['Entry Count'].values]
tuples = dict(zip(indexes, values))
jsonObj = json.dumps(tuples)
print(jsonObj)

sys.stdout.flush()