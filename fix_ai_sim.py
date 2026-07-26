import os

app_tsx_path = '/Users/b/Documents/Antigravity/thinkerbell/src/App.tsx'
aichat_mode_modal_path = '/Users/b/Documents/Antigravity/thinkerbell/src/components/AIChatModeSelectionModal.tsx'
aichat_view_path = '/Users/b/Documents/Antigravity/thinkerbell/src/components/AIChatView.tsx'

# 1. Update App.tsx persona role for simulation mode
with open(app_tsx_path, 'r') as f:
    app_content = f.read()

app_content = app_content.replace(
    "role: `${aiChatModeStory.category} 갈등 상대`,",
    "role: '상황',"
)
with open(app_tsx_path, 'w') as f:
    f.write(app_content)


# 2. Update AIChatModeSelectionModal.tsx
with open(aichat_mode_modal_path, 'r') as f:
    modal_content = f.read()

modal_content = modal_content.replace(
    '<h4 className="font-bold text-[#1C1C1C] mb-1">시뮬레이션 모드</h4>',
    '<h4 className="font-bold text-[#1C1C1C] mb-1">상황</h4>'
)
with open(aichat_mode_modal_path, 'w') as f:
    f.write(modal_content)


# 3. Update AIChatView.tsx
with open(aichat_view_path, 'r') as f:
    view_content = f.read()

view_content = view_content.replace(
    "{activeSession.chatMode === 'explanation' ? '상황 설명 모드' : activeSession.chatMode === 'simulation' ? '시뮬레이션 모드' : selectedPersona.role}",
    "{selectedPersona.role}"
)

old_button = 'onClick={() => setShowChat(false)} className="material-symbols-outlined text-[#3ECF8E] cursor-pointer hover:opacity-80"'
new_button = '''onClick={() => {
            if (activeSession.messages.length <= 1 && onDeletePersona) {
              onDeletePersona(selectedPersona.id);
            }
            setShowChat(false);
          }} className="material-symbols-outlined text-[#3ECF8E] cursor-pointer hover:opacity-80"'''

view_content = view_content.replace(old_button, new_button)

with open(aichat_view_path, 'w') as f:
    f.write(view_content)

print("done")
