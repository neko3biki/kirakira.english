document.addEventListener('DOMContentLoaded', () => {
    // --- 英単語と日本語訳のペアを設定します (24単語) ---
    // この配列の中身を編集するだけで、ゲームの単語を簡単に変更できます。
    const allWordPairs = [
        { english: "apple", japanese: "りんご" },
        { english: "cat", japanese: "ねこ" },
        { english: "dog", japanese: "いぬ" },
        { english: "book", japanese: "本" },
        { english: "sun", japanese: "太陽" },
        { english: "moon", japanese: "月" }, // Level 1 (6単語)

        { english: "bird", japanese: "鳥" },
        { english: "fish", japanese: "魚" },
        { english: "car", japanese: "車" },
        { english: "tree", japanese: "木" },
        { english: "flower", japanese: "花" },
        { english: "water", japanese: "水" }, // Level 2 (6単語)

        { english: "house", japanese: "家" },
        { english: "table", japanese: "テーブル" },
        { english: "chair", japanese: "いす" },
        { english: "pen", japanese: "ペン" },
        { english: "pencil", japanese: "鉛筆" },
        { english: "bag", japanese: "カバン" }, // Level 3 (6単語)

        { english: "happy", japanese: "嬉しい" },
        { english: "sad", japanese: "悲しい" },
        { english: "big", japanese: "大きい" },
        { english: "small", japanese: "小さい" },
        { english: "red", japanese: "赤" },
        { english: "blue", japanese: "青" }, // Level 4 (6単語)
    ];

    const wordsPerLevel = 6;
    let currentLevel = 0; // 現在のレベル (0からスタート)
    let currentLevelPairs = []; // 現在のレベルで使う単語ペア

    // --- フクロウの進化画像を設定 (配列のインデックスがレベルに対応) ---
    const owlEvolutionImages = [
        'owl_normal.png',       // Level 0 (初期状態)
        'owl_evolution1.png',   // Level 1 クリア後
        'owl_evolution2.png',   // Level 2 クリア後
        'owl_evolution3.png',   // Level 3 クリア後
        'owl_final.png'         // Level 4 (全クリア後)
    ];
    // これらの画像ファイルも用意して、index.htmlと同じフォルダに入れてください。


    // --- 音声合成機能の追加 ---
    const synth = window.speechSynthesis;
    let englishVoice = null;

    synth.onvoiceschanged = () => {
        const voices = synth.getVoices();
        englishVoice = voices.find(voice => 
            voice.lang === 'en-US' || 
            voice.lang === 'en-GB' || 
            voice.lang.startsWith('en-')
        );
        if (!englishVoice) {
            console.warn("英語の音声が見つかりませんでした。デフォルトの音声を使用します。");
        }
    };
    // --- 音声合成機能の追加終わり ---

    const englishWordsContainer = document.getElementById('english-words');
    const japaneseWordsContainer = document.getElementById('japanese-words');
    const resetButton = document.getElementById('reset-button');
    const messageDisplay = document.getElementById('message');
    const sparkleContainer = document.querySelector('.sparkle-container');

    const correctSound = document.getElementById('correct-sound');
    const wrongSound = document.getElementById('wrong-sound');

    const owlCharacter = document.getElementById('owl-character'); 

    // レベル表示要素も追加
    const levelDisplay = document.createElement('p');
    levelDisplay.id = 'level-display';
    levelDisplay.style.fontSize = '1.2em';
    levelDisplay.style.fontWeight = 'bold';
    levelDisplay.style.color = '#00796B';
    messageDisplay.parentNode.insertBefore(levelDisplay, messageDisplay); // メッセージの上に挿入

    // キャラクターの状態をリセットする関数
    function resetOwlCharacter() {
        owlCharacter.src = owlEvolutionImages[currentLevel]; // 現在のレベルに応じたフクロウ画像を表示
        owlCharacter.classList.remove('happy-animation', 'confused-animation');
        owlCharacter.removeEventListener('animationend', resetOwlCharacterForHappy);
    }

    // 正解時のキャラクターアクション (アニメーション終了時にリセット)
    function animateOwlHappy() {
        owlCharacter.src = 'reaction_happy.png'; // <-- ここを修正: 顔のドアップ画像
        owlCharacter.classList.add('happy-animation');
        owlCharacter.addEventListener('animationend', resetOwlCharacterForHappy, { once: true });
    }

    function resetOwlCharacterForHappy() {
        resetOwlCharacter(); // 通常のレベル画像に戻る
    }

    // 不正解時のキャラクターアクション
    function animateOwlConfused() {
        owlCharacter.src = 'reaction_confused.png'; // <-- ここを修正: 顔のドアップ画像
        owlCharacter.classList.add('confused-animation');
    }

    let selectedEnglishCard = null;
    let selectedJapaneseCard = null;
    let matchedCount = 0;

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function createWordCard(word, type) {
        const card = document.createElement('div');
        card.classList.add('word-card');
        card.textContent = word;
        card.dataset.word = word;
        card.dataset.type = type;
        
        card.addEventListener('click', () => {
            handleCardClick(card);

            if (type === 'english') {
                speakEnglishWord(word);
            }
        });
        return card;
    }

    function generateGame() {
        englishWordsContainer.innerHTML = '';
        japaneseWordsContainer.innerHTML = '';
        messageDisplay.textContent = '';
        resetButton.style.display = 'none';
        selectedEnglishCard = null;
        selectedJapaneseCard = null;
        matchedCount = 0;
        
        // 現在のレベルに応じた単語セットを抽出
        const startIndex = currentLevel * wordsPerLevel;
        currentLevelPairs = allWordPairs.slice(startIndex, startIndex + wordsPerLevel);

        if (currentLevelPairs.length === 0) {
            // 全レベルクリア後の処理
            messageDisplay.textContent = '全レベルクリア！おめでとう！';
            levelDisplay.textContent = '最終レベル！';
            owlCharacter.src = owlEvolutionImages[owlEvolutionImages.length - 1]; // 最終進化フクロウ
            resetButton.textContent = '最初からやり直す';
            resetButton.style.display = 'block';
            currentLevel = -1; // リセットボタンで最初に戻るためのフラグ
            return;
        }

        resetOwlCharacter(); // 現在のレベルのフクロウ画像を表示
        levelDisplay.textContent = `レベル ${currentLevel + 1}`;

        const shuffledEnglishWords = [...currentLevelPairs.map(p => p.english)];
        shuffleArray(shuffledEnglishWords);

        const shuffledJapaneseWords = [...currentLevelPairs.map(p => p.japanese)];
        shuffleArray(shuffledJapaneseWords);

        shuffledEnglishWords.forEach(word => {
            englishWordsContainer.appendChild(createWordCard(word, 'english'));
        });

        shuffledJapaneseWords.forEach(word => {
            japaneseWordsContainer.appendChild(createWordCard(word, 'japanese'));
        });
    }

    function handleCardClick(card) {
        if (card.classList.contains('matched')) return;

        if (card.dataset.type === 'english' && selectedEnglishCard && selectedEnglishCard !== card) {
            selectedEnglishCard.classList.remove('selected');
            selectedEnglishCard = null;
        } else if (card.dataset.type === 'japanese' && selectedJapaneseCard && selectedJapaneseCard !== card) {
            selectedJapaneseCard.classList.remove('selected');
            selectedJapaneseCard = null;
        }

        card.classList.toggle('selected');

        if (card.dataset.type === 'english') {
            selectedEnglishCard = card.classList.contains('selected') ? card : null;
        } else { // japanese
            selectedJapaneseCard = card.classList.contains('selected') ? card : null;
        }

        checkMatch();
    }

    function checkMatch() {
        if (selectedEnglishCard && selectedJapaneseCard) {
            const englishWord = selectedEnglishCard.dataset.word;
            const japaneseWord = selectedJapaneseCard.dataset.word;

            const isMatch = currentLevelPairs.some(pair => 
                pair.english === englishWord && pair.japanese === japaneseWord
            );

            if (isMatch) {
                correctSound.play();
                messageDisplay.textContent = 'やったね！せいかい！';
                
                animateOwlHappy();

                selectedEnglishCard.classList.add('matched');
                selectedJapaneseCard.classList.add('matched');
                selectedEnglishCard.classList.remove('selected');
                selectedJapaneseCard.classList.remove('selected');

                createSparkleEffect(selectedEnglishCard);
                createSparkleEffect(selectedJapaneseCard);

                selectedEnglishCard = null;
                selectedJapaneseCard = null;
                matchedCount++;

                if (matchedCount === currentLevelPairs.length) {
                    // 現在のレベルをクリア！
                    messageDisplay.textContent = `レベル ${currentLevel + 1} クリア！`;
                    resetButton.textContent = '次のレベルへ';
                    resetButton.style.display = 'block';
                    
                    currentLevel++; // レベルアップ！
                    // フクロウの進化画像を設定（次のレベルの画像）
                    if (currentLevel < owlEvolutionImages.length) {
                        owlCharacter.src = owlEvolutionImages[currentLevel];
                    } else { // 全レベルクリア後
                        owlCharacter.src = owlEvolutionImages[owlEvolutionImages.length - 1];
                    }
                }
            } else {
                wrongSound.play();
                messageDisplay.textContent = 'あれれ？ちがうみたいだよ。';
                
                animateOwlConfused();

                setTimeout(() => {
                    selectedEnglishCard.classList.remove('selected');
                    selectedJapaneseCard.classList.remove('selected');
                    selectedEnglishCard = null;
                    selectedJapaneseCard = null;
                    messageDisplay.textContent = '';
                    // 全クリア時以外はキャラクターを通常状態に戻す
                    if (matchedCount !== currentLevelPairs.length) { 
                       resetOwlCharacter(); 
                    }
                }, 800);
            }
        }
    }

    function createSparkleEffect(element) {
        const rect = element.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        for (let i = 0; i < 10; i++) {
            const sparkle = document.createElement('div');
            sparkle.classList.add('sparkle');
            const size = Math.random() * 8 + 4;
            sparkle.style.width = `${size}px`;
            sparkle.style.height = `${size}px`;

            const offsetX = (Math.random() - 0.5) * rect.width * 0.8;
            const offsetY = (Math.random() - 0.5) * rect.height * 0.8;

            sparkle.style.left = `${startX + offsetX}px`;
            sparkle.style.top = `${startY + offsetY}px`;
            
            sparkleContainer.appendChild(sparkle);

            sparkle.addEventListener('animationend', () => {
                sparkle.remove();
            });
        }
    }

    function speakEnglishWord(word) {
        if (synth.speaking) {
            synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(word);
        if (englishVoice) {
            utterance.voice = englishVoice;
        } else {
            utterance.lang = 'en-US';
        }
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        synth.speak(utterance);
    }

    resetButton.addEventListener('click', () => {
        if (currentLevel === -1) { // 全レベルクリア後の「最初からやり直す」ボタン
            currentLevel = 0;
            resetButton.textContent = 'もう一度プレイ'; // デフォルトに戻す
        }
        generateGame();
    });

    // ゲーム開始
    generateGame();
});
