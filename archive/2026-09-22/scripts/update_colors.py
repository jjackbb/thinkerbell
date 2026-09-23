import os

files = [
    '/Users/b/Documents/Antigravity/thinkerbell/src/components/WelcomeModal.tsx',
    '/Users/b/Documents/Antigravity/thinkerbell/src/components/CreateStoryModal.tsx'
]

color_map = {
    '#ff4d8b': '#3ECF8E',
    '#fffaf0': 'white',
    '#faf5e8': '#f8f9fa',
    '#f5f0e0': '#f8f9fa',
    '#e8e2d0': '#E5E7EB',
    '#ebe6d6': '#E5E7EB',
    '#0a0a0a': '#1C1C1C',
    '#1f1f1f': '#333333',
    '#6a6a6a': '#5f5e5e',
    '#b8a4ed': '#3ECF8E',  # AI box background in CreateStoryModal was purple #b8a4ed
    'bg-[#fffaf0]': 'bg-white',
    'bg-[#faf5e8]': 'bg-[#f8f9fa]',
    'bg-[#f5f0e0]': 'bg-[#f8f9fa]',
    'border-[#e8e2d0]': 'border-[#E5E7EB]',
    'border-[#ebe6d6]': 'border-[#E5E7EB]',
    'text-[#0a0a0a]': 'text-[#1C1C1C]',
    'text-[#ff4d8b]': 'text-[#3ECF8E]',
    'text-[#6a6a6a]': 'text-[#5f5e5e]',
    'bg-[#0a0a0a]': 'bg-[#1C1C1C]',
    'hover:bg-[#1f1f1f]': 'hover:bg-[#333333]',
    'bg-[#b8a4ed]': 'bg-[#3ECF8E]/20 text-[#3ECF8E]', # Need to be careful here
}

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()

    # Apply CheckCircle2 -> Check, and remove circle from CircleCheck?
    # Wait, WelcomeModal has `<CheckCircle2 className="w-4 h-4 text-[#ff4d8b]" />`
    # Let's replace CheckCircle2 with Check in WelcomeModal
    if 'WelcomeModal' in file_path:
        content = content.replace('<CheckCircle2 ', '<Check ')
        content = content.replace('CheckCircle2, ', 'Check, ')
        content = content.replace('import { CheckCircle2', 'import { Check')

    for old_color, new_color in color_map.items():
        content = content.replace(old_color, new_color)

    with open(file_path, 'w') as f:
        f.write(content)

print("Colors updated successfully!")
