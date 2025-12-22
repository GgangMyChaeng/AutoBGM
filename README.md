<div class="container">
<h1>AutoBGM (For SillyTavern)</h1><div></div>
        <div class="toc">
            <h2>목차</h2>
            <ul>
                <li><a>License</a></li>
                <li><a>설명</a>
                    <ul>
                        <li><a>해당 확장에 대한 이해를 도울 Q&amp;A</a></li>
                        <li><a>튜토리얼</a>
                            <ul>
                                <li><a>For start</a></li>
                            </ul>
                        </li>
                        <li><a>디테일</a>
                            <ul>
                                <li><a>Extensions menu</a></li>
                                <li><a>Modal (AutoBGM Settings)</a></li>
                                <li><a>Presets</a></li>
                                <li><a>BGM list</a></li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
                    <h2>License</h2><p>✔️ This project is licensed under CC BY-NC-ND 4.0.<br>✔️ This project includes third-party software: Third-party libraries(JsZip) are licensed separately.&nbsp;<span style="background-color: initial;">JSZip →&nbsp;</span><span style="background-color: initial;">Copyright (c) Stuart Knightley —&nbsp;</span><span style="background-color: initial;">Licensed under the MIT License.</span></p><p>✔️ 비상업적 용도에 한해 깡통 사이트 내 공유 가능</p><p>(<a href="https://kkangtong.xyz/" target="_blank" rel="noopener noreferrer">https://kkangtong.xyz/</a>)</p><p><span style="background-color: initial;">✔️ 확장 자체의 소스 코드 및 파일 수정·변형·재배포 금지</span></p><p><span style="background-color: initial;">✔️ 확장을 통해 생성된 프리셋 및 사용자 데이터는 자유롭게 사용 가능</span></p><p><span style="background-color: initial;">✔️ 해당 확장 공유 시 출처 표기 필수&nbsp;</span><span style="background-color: initial;">(이왕이면 깃허브보다는 현재 페이지 주소로)</span></p></div></div><div class="license-buttons">
            </div>
        </div>
        <h2 id="description">설명</h2>
        <p>SillyTavern 전용 확장임</p>
        <p><strong>해당 확장에 대한 설명과 기능들은 "튜토리얼" 챕터와 "디테일" 챕터 내에 포함되어 있으니 참고 바람</strong></p>
        <p>설명이나 기능과 관련하여 궁금해 할만한 사안은 해당 항목들 밑에도 미리 Q, A 형식에 맞춰 자체적으로 풀어두긴 했는데, 그래도 설명이 부족할 수도 있으니 양해 바람</p>
        <h3 id="qa">해당 확장에 대한 이해를 도울 Q&amp;A</h3>
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>왜 만듦?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>프리셋에 추가한 BGM들에 키워드를 매칭, Ai의 마지막 메시지에 해당 키워드가 있을 시 우선도에 따라 mp3 파일을 웹으로 자동 재생하는 확장을 만들고 싶었음.</div>
    </div>
  </div>
</div>

<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>키워드 여러 개 지정 가능?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>가능함. 애초에 키워드 여러 개 지정하는 게 해당 확장 제작 목적의 핵심이었음. <b>쉼표로 구분</b>하여 다수의 키워드를 매칭해주면 됨.</div>
    </div>
  </div>
</div>

<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>키워드 지정에 대해서 감이 안 잡히는데 어떻게 쓰라는 거?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>상태창을(비슷한 거라도) 매 지문마다 작성하라는 지시사항이 프롬프트나 월드인포에 있을 시, 일관된 형식이 존재하여 키워드 형식을 특정해서 잡기 쉬워지기 때문에 시너지가 좋을 것임</div>
<blockquote>🍏 상태창 내부에 "시간:(아침/낮/저녁/밤)"이 포함되어 있다면 BGM 키워드에 "시간:아침" 식으로 매칭해서 활용할 수 있겠음. 혹은 세계관에 지역이 포함된 캐릭터 카드 같은 경우 "장소: (장소 명칭)" 식으로 상태창에 출력하게 하여 특정 BGM별로 키워드를 매칭시킬 수 있겠음.
      </blockquote>
    </div>
  </div>
</div>

<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>그럼 현재 상황의 분위기나 특정 캐릭터들 감정에 따라 BGM 키워드를 잡을 순 없다는 거임?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>원작이 게임인 2차 자작시뮬봇을 만들다가 귀가 심심해서 만들게 된 확장이라 아무래도 캐릭터들의 감정선을 알아서 인식해서 잡기보다는, 특정 시간대나 장소를 키워드로 지정하는 걸 생각하며 기능을 만들었으니 한계가 있음. 키워드를 "싸우다, 싸움, 화나다, 화, 분노, 격노, 깡!, 젠장 🐶,..." 이딴식으로 빡세게 잡는 것도 참 끔찍하고 비효율적임. 하지만 방법은 존재하는데...</div>
            <blockquote>🍏 그럼 어떻게 하느냐? 분위기, 상황, 감정 등을 상태창에 끼워넣어주면 그만임. 예를 들어 상태창에 관한 AI 지시사항에...<br>
<br>
# 상태창 작성 가이드라인<br>
                - 형식: &lt;태그이름&gt;시간:(아침/낮/저녁/밤)|상태:({{char}}의 상태)|...&lt;/태그이름&gt;<br>
<br>
                ## 키-값 설명<br>
                - 시간: 하루의 시간을 4분할로 나누는 방식. 해당 키에는 아침/낮/저녁/밤 중에 출력 ㄱㄱ<br>
                - 상태: {{char}}의 기분과 상태에 따라 이모지를 출력. 사용할 수 있는 이모지는 하위 항목과 같음.<br>
                &nbsp;&nbsp;* 😃: 기쁠 때<br>
                &nbsp;&nbsp;* 🥲: 슬플 때<br>
                &nbsp;&nbsp;* ⚔️: 전투 중일 때<br><br>
                위처럼 하고 키워드에는 "아침", "😃" 등을 넣으면 됨. 위에 쓴 지시사항은 예시라 대충 쓴 거고 형식은 자율임.
            </blockquote>
    </div>
  </div>
</div>
        
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>그럼 한 지문 내에서 키워드 여러개가 뜨면 어떡함?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>BGM List에서 각 BGM 파일 별로 우선도 설정이 가능하게 되어있음. 해당 기능 활용하면 됨. 만약 우선도까지 겹치면 그중에 랜덤하게 재생될 거임.</div>
    </div>
  </div>
</div>
        
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>유저 메시지까지 인식함?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>{{user}} 메시지 제외하고 AI의 마지막 메시지만 인식함. BGM이 너무 자주 바뀌지 않게 하기 위해서, 그리고 수월한 키워드 세팅을 위해서 그렇게 해둠.</div>
    </div>
  </div>
</div>
        <h3 id="tutorial">튜토리얼</h3>
        <h4 id="for-start">For start</h4>
        <ol start="0">
            <li>해당 확장을 SillyTavern의 확장 프로그램 설치를 눌러 설치</li>
            <li>확장 메뉴 중 AutoBGM을 눌러 메뉴를 펼친 뒤 Enabled를 눌러 해당 확장을 활성화</li>
            <li>Enabled 버튼 아래 톱니바퀴(Settings) 버튼 클릭을 통해 해당 확장의 모달 화면 활성화</li>
            <li>프리셋 제작 or 프리셋 불러오기(Import)</li>
            <li>BGM 삽입 (mp3 파일을 개별로 넣거나 Zip으로 압축한 상태의 mp3 파일들도 가능)</li>
        </ol>
        <h5>키워드 모드 사용 시...</h5>
        <ol start="5">
            <li>BGM list의 bgm별로 키워드 매칭 (쉼표를 사용하여 다수의 키워드 매칭 가능)</li>
            <li>개인 세팅
                <ul>
                    <li>마지막 ai 메시지에 키워드 없을 시 자동으로 재생될 Default audio 지정 (하지 않아도 무관)</li>
                    <li>볼륨 조정: 슬라이더 방식과 입력 방식으로 나뉨. 편한 거 쓰면 됨.</li>
                    <li>우선도(Priority) 조정: 다수의 키워드가 지문에 걸렸을 때, 해당 값이 가장 큰 BGM을 재생</li>
                </ul>
            </li>
            <li>키워드 모드(Keyword Mode)가 켜져있는 상태로 모달 화면을 닫고 채팅</li>
        </ol>
        <h5>키워드 모드 필요없는데...</h5>
        <ol start="5">
            <li>재생 모드(Play Mode)를 통해 귀찮은 설정 없이 즐길 수 있겠음</li>
            <li>물론 이 경우에도 각 BGM 파일마다 각각의 볼륨 설정을(필수는 아니고 선택 사항임) 통해 좀 더 매끄럽게 사용 가능</li>
        </ol>
        <hr>
        <h3 id="details">디테일</h3>
        <h4 id="extensions-menu">Extensions menu</h4>
        <p>해당 확장을 설치 시, SillyTavern 확장 메뉴에서 AutoBGM을 발견할 수 있음</p>
        <ul>
            <li><strong>Enabled:</strong> 해당 확장을 활성화 / 비활성화 시킬 수 있음</li>
            <li><strong>톱니바퀴(Settings) 버튼:</strong> 해당 확장의 모달을 오픈, 상세 설정이 가능함</li>
            <li><strong>Now Playing:</strong> 현재 재생 중인 곡, 키워드 모드를 포함한 5가지 재생 모드 중 무엇인지, 어느 프리셋의 bgm인지, 재생 중인지 정지 중인지를 확인할 수 있음. 이외에 후술할 디버그 모드를 통해 다른 정보도 확인 가능.</li>
        </ul>
        <h4 id="modal">Modal (AutoBGM Settings)</h4>
        <p><strong>키워드 모드(Keyword Mode):</strong> Ai의 마지막 메시지에서 키워드가 인식되면 자동으로 해당 BGM이 조건에(키워드 인식, 우선도 등) 따라 자동 재생해주는 기능임. 키워드 트리거 방식 기반이므로 개별 재생(Play) 버튼은 자동으로 비활성화 됨.</p>
        
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>"갤햄이, 빵덩이"를 키워드로 세팅하면 "갤햄이", " 빵덩이" 이딴식으로 되는 거 아님?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>텍스트 <b>외부</b>의 띄어쓰기는 키워드에 포함되지 않음. 예를 들어...</div>
            <blockquote>
                "갤햄이, 빵덩이" → "갤햄이", "빵덩이"<br>"나와라 갤햄이, 빵으로 태어나 빵으로 살아갈 뿐입니다" → 유지<br>이런 식임
            </blockquote>
    </div>
  </div>
</div>
        <p><strong>디버그 모드(Debug Mode):</strong> 지금 확장이 제대로 돌아가고 있는지 "Now Playing"에서 확인할 수 있음. 기본적으로 보이는 건 "asstLen"고, 키워드 모드 활성화 시 "kw"와 "hit"가 추가로 보임.</p>
        <ul>
            <li><strong>asstLen:</strong> 마지막 Ai 메시지의 공백 및 줄바꿈 포함 글자수를 세주는 기능 (JS 문자열 기준, UTF-16 코드 유닛 카운트)</li>
            <li><strong>kw:</strong> 현재 마지막 Ai 메시지 기준으로 어떤 키워드들이 트리거됐는지 보여주는 기능임</li>
            <li><strong>hit:</strong> 어떤 곡이 트리거됐는지(로직에 따라 <strong>최종적으로</strong> 결정된 곡 하나) 알려주는 기능임</li>
        </ul>
        
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>사용자가 쓸 일이 있음?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>키워드 설정을 해두고 제대로 매칭됐는지 확인하는 용도로 사용 가능. 사실 사용자보다는 어디가 또 터졌는지 확인해야 하는 나를 위한 기능이긴 한데 그래도 혹시 모르니까 뒀음.</div>
    </div>
  </div>
</div>
        
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>그럼 키워드 모드 켰을 때 트리거 된 키워드 없을 땐 뭐 뜸?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>그 경우 "kw", "hit" 모두 none이 뜸. 다만, "use default when no keyword"가 켜져 있으면 hit에는 해당 default BGM이 뜰 거임.</div>
    </div>
  </div>
</div>
        <p><strong>재생 모드(Play Mode):</strong> 키워드 모드 비활성화 시 사용할 수 있는 모드인데, 모드는 Manual(일반 재생), Loop One(단일 무한 재생), Loop List(리스트 무한 재생), Random(랜덤 재생)이 있음</p>
        <ul>
            <li><strong>Manual(일반 재생):</strong> 한 곡을 재생시켜두면 해당 곡 종료 시 다른 곡으로 넘어가거나 하는 이벤트는 발생하지 않음</li>
            <li><strong>Loop One(단일 무한 재생):</strong> 한 곡을 재생해두면 해당 곡만 무한 자동 재생됨</li>
            <li><strong>Loop List(리스트 무한 재생):</strong> 해당 프리셋의 BGM 리스트에 들어있는 BGM 순서대로(Sort로 순서 조정 가능) 무한 재생</li>
            <li><strong>Random(랜덤 재생):</strong> 해당 프리셋의 BGM 리스트에 들어있는 BGM을 랜덤한 순으로 무한 재생. 단, 이 경우 해당 모드를 활성시킬 두 가지 방법이 있는데...
                <blockquote>🍏 일단 아무 곡이나 재생시켜 두고 재생 모드의 Manual 상태를 Random으로 바꿔주기 (Random 재생의 첫 곡을 원하는 곡으로 시작 가능)<br>🍏 재생 모드를 Random으로 설정해둔 후 Enabled로 확장을 껐다 켜주기
                </blockquote>
            </li>
        </ul>
        <p><strong>전체 볼륨(Global Volume):</strong> BGM List에서 BGM마다 상세 볼륨을 설정해놨어도, 해당 설정을(Global Volume) 통해 전반적인 소리 크기를 조정할 수 있음</p>
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>어차피 사용자가 이용하는 기기도 볼륨 크기 설정할 수 있는데 왜 필요함?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>해당 설정은 프리셋 mp3 파일들의 소리 크기 평균값이 지나치게 작거나 커서 그 편차 때문에 사용하기 불편해지는 경우를 방지하고자 만들어둔 또 하나의 전반적인 쿠션 기능이라고 보면 됨. "BGM list Entry"에 mp3 파일 각각의 볼륨을 설정할 수 있는 기능이 또 있으니 세부 설정은 거기서 하면 되겠음.</div>
    </div>
  </div>
</div>
        <h4 id="presets">Presets</h4>
        <p>기능 설정에 앞서 알아둬야 할 것이 있는데, 사용 중인 프리셋의 상태는(설정은) 수정할 때마다 그 상태로 저장됨 (SillyTavern 월드인포도 키워드 변경하거나 이거저거 손댄 순간 그대로 적용되는 거니까, 그거 생각하면 이해하기 쉬움. 같은 로직임. 그래서 수정하다가 설정해둔 거 괜히 실수로 날려먹지 말라고 후술할 Import, Export 등이 있는 거임.)</p>
        <ul>
            <li><strong>프리셋 추가(+) 버튼:</strong> 새 프리셋 생성 기능</li>
            <li><strong>삭제(쓰레기통) 버튼:</strong> 현재 프리셋 삭제 기능 → 실수로 삭제하지 말라고 쿠션 창(확인 메시지) 하나 뜸</li>
            <li><strong>수정(연필) 버튼:</strong> 현재 프리셋 명칭 수정 기능 → 입력창에 변경할 명칭 적어두고 연필 누르면 됨</li>
            <li><strong>Import:</strong> (이름)_AutoBGM.json 파일을 삽입하면, 프리셋의 명칭·mp3 파일명·키워드·우선도·볼륨 설정만 불러와짐. BGM을 위한 mp3 파일은 따로 개인이 삽입해 줘야 함. 해당 프리셋의 mp3 파일명과 일치하는 것들을 불러와주면 알아서 잘 기능할 거임.</li>
        </ul>
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>(이름)_AutoBGM.json이라 했는데, 해당 프리셋 json 파일 이름이 (이름)_AutoBGM 형식이 아닌 파일은 프리셋 명칭이 제대로 적용 안 되는 거 아님?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>아님. 예를 들어 "123_AutoBGM.json" 파일의 명칭을 "똥.json" 으로 바꿔줘도 확장명(json)만 살아있으면 되는 거니까 걱정하지 않아도 됨. 파일의 명칭이 프리셋 이름으로 설정되는 게 아니라 파일 내부에 프리셋 명칭 설정이 저장되는 로직이기 때문임.</div>
    </div>
  </div>
</div>
        <ul>
            <li><strong>Export:</strong> 바로 위에 언급된 설정들이(해당 프리셋의 명칭·mp3 파일명·키워드·우선도·볼륨 설정) 저장된 파일이 생성됨. 해당 프리셋을 위한 mp3 파일까지 저장·공유를 하고 싶다면 개인이 따로 세팅해야 함.</li>
            <li><strong>Bind to Characters:</strong> 특정 캐릭터와의 채팅에서 자동으로 해당 프리셋이 연결되도록 돕는 기능임. 한 프리셋에 다수의 캐릭터를 종속시켜 줄 수 있음.</li>
        </ul>
        <h4 id="bgm-list">BGM list</h4>
        <ul>
            <li><strong>MP3 파일 추가(음표):</strong> 특정 경로에 있는 MP3 파일을 인식시켜줄 수 있음</li>
            <li><strong>ZIP 파일 추가(ZIP):</strong> 특정 경로에 있는 ZIP 파일을(MP3 파일이 들어가있는 ZIP) 인식시켜줄 수 있음</li>
        </ul>
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>파일 경로 바뀌면 BGM 재생 안 됨?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>아님. 먹여둔 파일은 해당 파일들 경로 바뀌어도 잘만 작동하니 걱정할 필요 없음.</div>
    </div>
  </div>
</div> 
        <ul>
            <li><strong>Default:</strong> <strong>"Use Default when no keyword" 설정을 켜야 작동</strong>하며 <strong>키워드 모드 활성화 중에</strong>, AI의 마지막 컨텍스트에 인식 된 키워드가 없을 때 재생 될 Default BGM을 설정할 수 있는 기능임. 키워드 모드 킨 상태로 설정해 둔 Default BGM도 없고 인식된 키워드도 없다면 이전 곡 재생이 유지됨.</li>
            <li><strong>Use Default when no keyword:</strong> <strong>키워드 모드 활성화 중에</strong>, AI의 마지막 지문에 인식 된 키워드가 없을 때 원래 재생되던 이전 BGM이 아니라 Default BGM이 재생되도록 하는 기능임. 반대로 타이틀 곡(Default BGM)이 설정되어 있지만, 이전 곡 재생을 유지하고 싶다면 해당 기능을 끄면 됨.</li>
        </ul>
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>"Default" 설정에 몰빵하면 되는 거 아님? "Use Default when no keyword" 버튼이 왜 필요함?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>해당 프리셋의 타이틀(Default) 곡은 유지하되, 이전 곡 재생 유지 여부만 조정하기 위해 있는 편의성 기능임. 타이틀 곡을 Default 설정으로 매번 다시 세팅했다가 풀었다가 반복하기 귀찮으니 있는 버튼이라고 보면 됨.</div>
    </div>
  </div>
</div>
        <ul>
            <li><strong>Sort:</strong> BGM List의 파일 정렬 순서 설정 기능임</li>
            <li><strong>선택 삭제(쓰레기통):</strong> 선택한 BGM들을 삭제해주는 기능임 → 실수로 삭제하지 말라고 쿠션 창(삭제 확인 메시지) 뜰 거임</li>
            <li><strong>Expand all rows(하단):</strong> BGM 설정 창을 전부 펼쳐주는 기능임</li>
            <li><strong>Collapse all rows(상단):</strong> BGM 설정 창을 전부 접어주는 기능임</li>
            <li><strong>Lock all volume sliders(자물쇠):</strong> 각 BGM 볼륨을 설정해주는 슬라이더를 잠가주는 기능임 → 키워드나 우선도 설정하다가 실수로 볼륨 설정 바꿔버리는 경우를 방지해 줌, 다만 볼륨 설정 입력창까지 잠가주진 않으니 그 점 유의 바람. 볼륨 입력창은 눌러서 수치를 입력 해야 바뀌니까 굳이 실수할 거라 생각은 안 하고, 디테일한(터치로 하기 불편한 1 단위 조절이라든지) 설정을 할 수 있게 안 잠기게 해둔 거임.</li>
        </ul>
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>볼륨 올 락 걸어버리면 개별 볼륨 설정은 영원히 바꿀 수 없는 거임?</div>
    </div>
  </div>
  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>항목에 들어가서 자물쇠 풀면 다시 해당 BGM 볼륨 슬라이더 설정 사용 가능하니까 걱정 안 해도 됨.</div>
    </div>
  </div>
</div>
        <h5>BGM list Entry</h5>
        <ul>
            <li><strong>File:</strong> 파일명 변경 가능. 사용 중인 기기 내의 mp3 파일 이름이 변경되는 게 아니라 리스트 내에서만 변경되는 기능임. 리스트에 이미 인식시켜 두었던 기기 내의 BGM 파일명을(mp3 파일의 이름) 변경했을 때, 리스트에서 변경된 이름 때문에 인식하지 못할 수 있으므로 사용하라고 있는 기능.</li>
        </ul> 
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>파일 뒤에 붙는 확장명 거슬리는데 항목 File 이름에서 ".mp3" 지워도 됨? 그러고 BGM 파일 이름도 내 입맛대로 바꿔도 됨?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>안 됨. 그럼 리스트가 해당 파일 인식 못해서 해당 항목은 유령 항목이 됨. 무조건 "(해당 mp3 파일 원본 이름).mp3" 상태를 유지해 줘야 함.</div>
    </div>
  </div>
</div>
        <ul>
            <li><strong>Play:</strong> 누르면 재생됨.</li>
            <li><strong>펼치기/접기(More):</strong> BGM File 각각의 설정을 위한 기능. 항목별로 펼치거나 접을 수 있음.</li>
            <li><strong>Keywords:</strong> 해당 BGM이 트리거(재생) 될 키워드 매칭 기능. 이 확장의 핵심 기능이라고 볼 수 있음. 쉼표로 구분하여 다수의 키워드를 매칭할 수 있음.</li>
            <li><strong>Priority:</strong> BGM들 각각의 키워드들이 Ai의 마지막 메시지에서 인식됐을 때, 그 중에서 어느 BGM을 재생시킬 거냐를 선별해줄 기능임. 각 BGM들의 여러 키워드가 인식돼도, 우선도 숫자가 가장 큰 BGM이 재생됨.</li>
        </ul>
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>그럼 여러 BGM을 활성화시키는 여러 키워드들이 인식됐을 때 그 BGM들 우선도가 같으면 뭐가 재생됨?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>그렇게 트리거 된 경우, 이미 재생되고 있던 BGM(이 경우 재생 유지) → 랜덤(트리거 됐으나, 가장 큰 우선도를 가진 BGM이 없고 모두 동일한 우선도 값일 때) → 우선도가 가장 큰 것 순으로 재생되게 로직을 짜두었음.</div>
    </div>
  </div>
</div>
        <ul>
            <li><strong>Volume:</strong> mp3 파일들의 소리 설정을 각각 따로 할 수 있게 해주는 기능임. 어떤 파일은 기본적으로 소리가 크고, 어떤 건 기본적으로 작은 경우 같이 소리 크기의 편차가 있을 때를 위한 기능임.
                <ul>
                    <li><strong>슬라이더:</strong> 좌측(0)-우측(100). 터치하여 조정 가능.</li>
                    <li><strong>입력칸:</strong> 터치만으로는 작은 단위의 변화를 주기 불편할 수 있기 때문에 1 정도의 작은 단위의 변화를 주고 싶은 경우를 위한 기능임.</li>
                </ul>
            </li>
        </ul>
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>슬라이더랑 입력칸 따로 노는 거 아님?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>슬라이더와 입력칸은 기본적으로 상시 호환됨. 어느 쪽을 적용시키든 바로 다른쪽 수치에도 자동 반영되니 걱정할 필요 없음.</div>
    </div>
  </div>
</div>
        
<div class="qa-chat">
  <div class="qa-msg q">
    <div class="qa-bubble">
      <div class="qa-tag">Q</div>
      <div>슬라이더 잘못 누르면 끝장 아님? MP3 파일 자체 소리가 크면 슬라이더 잘못 터치하고 귀에서 피 나는 거 아님? 이거저거 수정할 때 불편하지 않겠음?</div>
    </div>
  </div>

  <div class="qa-msg a">
    <div class="qa-bubble">
      <div class="qa-tag">A</div>
      <div>그래서 후술할 자물쇠 기능을 만들어 둠</div>
    </div>
  </div>
</div>
        <ul>
            <li><strong>자물쇠(Lock slider):</strong> 실수로 슬라이더를 눌러서 볼륨 설정을 원치 않게 바꾸게 되는 경우를 방지하고자 만든 쿠션 기능임. 눌러서 볼륨 슬라이더를 잠그거나, 풀 수 있음.</li>
            <li><strong>삭제(쓰레기통):</strong> 해당 항목 BGM 파일을 리스트에서 삭제해주는 기능 → 실수로 삭제할 경우를 방지하고자 쿠션 창이 하나 뜸</li>
        </ul>
        <hr>
                <details><summary>개발자 노트</summary>
                <h3>현재 깃허브 폴더 상태</h3>
                <h4>AutoBGM 폴더(github root) 안에:</h4>
                <p>- index.js<br>
                - manifest.json<br>
                - style.css</p>
                <h4>AutoBGM/templates 폴더 안에:</h4>
                <p>- popup.html<br>
                - window.html</p>
                <h4>AutoBGM/vendor 폴더 안에:</h4>
                <p>- jszip.min.js</p>
                <h3>체크 리스트</h3>
                <h4>@SillyTavern확장 메뉴에서...@</h4>
                <p>- 해당 확장이 SillyTavern 내의 확장 메뉴에 뜨는가? (o)<br>
                - 확장 메뉴 ui가 적용됐는가? (o)<br>
                - 확장 메뉴에서 톱니바퀴 버튼(settings)을 눌렀을 때 모달이 뜨는가? (o)<br>
                - Enabled 버튼을 통해 해당 확장의 활성화·비활성화가 기능하는가? (O)<br>
                - Now Playing에서 현재 재생 중인 곡, 재생 모드, 해당 프리셋, 상태(재생 중/일시정지)가 뜨는가? (O)</p>
                <h4>@모달에서...@</h4>
                <p>- 모달 ui가 적용됐는가? (o)<br>
                - 화면폭이 줄어들거나 넓어짐에 따라 모달 창 크기가 최적화되는가? (O)<br>
                - 프리셋 ui가 정상적으로 세팅됐는가? (O)<br>
                - BGM list의 ui가 정상적으로 세팅됐는가? (o)<br>
                - BGM list의 각 항목의 설정 전체를 접거나 펼칠 수 있는가? (O)<br>
                - BGM 개별 항목 볼륨 설정 전체 락버튼이 기능하는가? (O)<br>
                - 프리셋이나 BGM 파일 삭제 전 쿠션(확인 메시지)이 뜨는가? (O)<br>
                - 모달의 Now Playing에서 현재 재생 중인 곡, 재생 모드, 해당하는 프리셋, 상태(재생 중/일시정지)가 뜨는가? (O)</p>
                <h4>@프리셋에서...@</h4>
                <p>- 프리셋 기능인<br>
                &nbsp;&nbsp;* 저장, 삭제가 작동하는가? (o)<br>
                &nbsp;&nbsp;* 불러오기, 내보내기가 작동하는가? (o)<br>
                &nbsp;&nbsp;* 불러오기 시, 유저의 기존 프리셋이 초기화되지 않고 해당 프리셋만 추가로 불러와지는가? (o)<br>
                &nbsp;&nbsp;* 내보내기 시, 해당 프리셋 명칭 그대로 저장되는가? (O)<br>
                &nbsp;&nbsp;* 키워드 모드 활성화 시, BGM List의 개별 재생 버튼은 비활성화 되는가? (O)<br>
                &nbsp;&nbsp;* 프리셋을 변경했을 때, 기존에 재생되던 mp3는 자동으로 꺼지는가? (O)<br>
                &nbsp;&nbsp;* 종속(Bind to Characters) 버튼이 있는가? (O)</p>
                <h4>@BGM list에서...@</h4>
                <p>- BGM list의 기능인<br>
                &nbsp;&nbsp;* BGM 개별 삽입, 삭제가 작동하는가? (O)<br>
                &nbsp;&nbsp;* mp3 파일이 담긴 zip 폴더를 삽입했을 시 BGM 파일을 인식하는가? (o)<br>
                &nbsp;&nbsp;* 키워드 저장이 작동하는가? (O)<br>
                &nbsp;&nbsp;* 개별 볼륨 조절 설정이 저장되는가? (O)<br>
                &nbsp;&nbsp;* 볼륨 설정 스크롤 바와 입력창의 값이 호환되는가? (O)<br>
                &nbsp;&nbsp;* BGM이 이름 알파벳 순, 알파벳 역순 혹은 추가한 순, 추가한 역순으로 정렬되는가? (O)<br>
                &nbsp;&nbsp;* Default BGM이 설정되는가? (O)<br>
                &nbsp;&nbsp;* 키워드 모드 비활성화 상태에서 사용 가능한 &gt; 일반 재생 / 랜덤 재생 / 단일 무한 재생 / 설정한 순서별 무한 재생 버튼이 있는가? (O)</p>
                <p>- AutoBGM의 기본 기능인<br>
                &nbsp;&nbsp;* BGM 재생, 일시정지가 작동하는가? (O)<br>
                &nbsp;&nbsp;* 개별 볼륨 조절 설정이 작동하는가? (O)<br>
                &nbsp;&nbsp;* 개별 볼륨 설정을 기반으로 두고(키워드 모드, 4가지 재생 모드 전부) 글로벌 볼륨이(개별 볼륨 세팅 + 전반적인 볼륨 크기 조절 형식으로) 상시 작동하는가? (O)<br>
                &nbsp;&nbsp;* 키워드 모드 비활성화 상태에서 일반 재생 / 랜덤 재생 / 단일 무한 재생 / 설정한 순서별 무한 재생 기능이 정상 작동하는가? (O)<br>
                &nbsp;&nbsp;* 종속 기능이 작동하는가? (O)</p>
                <p>- 키워드 모드 활성화 중에...<br>
                &nbsp;&nbsp;* 키워드 인식 기반 자동 재생 기능이 작동하는가? (O)<br>
                &nbsp;&nbsp;* Ai의({{char}}) 마지막 메시지에서만 키워드를 인식하는가? (O)<br>
                &nbsp;&nbsp;* 키워드 여러 개가 인식됐을 때, 우선도가 가장 큰 것이 재생되는가? (O)<br>
                &nbsp;&nbsp;* 키워드 여러 개가 인식됐을 때, 우선도가 모두 같다면, 그 중에 랜덤으로 재생되는가? (O)<br>
                &nbsp;&nbsp;* 마지막 AI 메시지에 인식된 키워드가 없고, Default로 설정해둔 BGM이 있을 시 해당 BGM이 상시 재생되는가? (O)<br>
                &nbsp;&nbsp;* 마지막 AI 메시지에 인식된 키워드가 없고, Default BGM도 없을 시, 이전에 재생 중이었던 BGM이 유지(자동 무한 재생)되는가? (O)<br>
                &nbsp;&nbsp;* 채팅에서 나왔을 시 BGM이 정상적으로 꺼지는가? (O)<br>
                &nbsp;&nbsp;* 채팅에 다시 들어갔을 때 ai 마지막 메시지를 인식하여 자동으로 해당 곡이 재생되는가? (O)</p>
                <p><br>&gt; 노트: 이제부터는 테스트 &amp; UI만 손보면 될 듯</p>
            </div>
        </div>
    </div><details>
