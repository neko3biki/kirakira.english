document.addEventListener('DOMContentLoaded', () => {
    // ここで英単語と日本語訳のペアを設定します。
    // この配列の中身を編集するだけで、ゲームの単語を簡単に変更できます。
    const wordPairs = [
        { english: "apple", japanese: "りんご" },
        { english: "cat", japanese: "ねこ" },
        { english: "dog", japanese: "いぬ" },
        { english: "book", japanese: "本" },
        { english: "sun", japanese: "太陽" },
    ];

    // --- 音声合成機能の追加 ---
    const synth = window.speechSynthesis; // 音声合成APIのインスタンス
    let englishVoice = null; // 英語の声を格納する変数

    // 利用可能な音声が読み込まれたら、英語の音声を探して設定
    synth.onvoiceschanged = () => {
        const voices = synth.getVoices();
        // より自然な英語の音声を探す（'en-US'や'en-GB'など、環境によって利用可能な音声は異なります）
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

    // --- キャラクター関連の追加 ---
    const owlCharacter = document.getElementById('owl-character'); // フクロウの画像要素を取得

    // キャラクターの状態をリセットする関数
    function resetOwlCharacter() {
        owlCharacter.src = 'owl_normal.png'; // 通常の画像に戻す
        owlCharacter.classList.remove('happy-animation', 'confused-animation'); // アニメーションクラスを削除
        owlCharacter.removeEventListener('animationend', resetOwlCharacterForHappy); // 念のためイベントリスナーも削除
    }

    // 正解時のキャラクターアクション (アニメーション終了時にリセット)
    function animateOwlHappy() {
        owlCharacter.src = 'owl_happy.png';
        owlCharacter.classList.add('happy-animation');
        // アニメーション終了後に通常状態に戻すためのイベントリスナー
        owlCharacter.addEventListener('animationend', resetOwlCharacterForHappy, { once: true });
    }

    // happy-animationが終了した時に呼ばれる専用のハンドラ
    function resetOwlCharacterForHappy() {
        resetOwlCharacter();
    }

    // 不正解時のキャラクターアクション
    function animateOwlConfused() {
        owlCharacter.src = 'owl_confused.png';
        owlCharacter.classList.add('confused-animation');
    }
    // --- キャラクター関連の追加終わり ---

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
        card.dataset.word = word; // マッチングのために元の単語を保持
        card.dataset.type = type; // english or japanese
        
        card.addEventListener('click', () => {
            handleCardClick(card); // 既存のカードクリック処理を呼び出し

            if (type === 'english') { // 英単語カードがクリックされた場合のみ発音
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
        
        resetOwlCharacter(); // ゲーム開始時にもキャラクターをリセット

        const shuffledEnglishWords = [...wordPairs.map(p => p.english)];
        shuffleArray(shuffledEnglishWords);

        const shuffledJapaneseWords = [...wordPairs.map(p => p.japanese)];
        shuffleArray(shuffledJapaneseWords);

        shuffledEnglishWords.forEach(word => {
            englishWordsContainer.appendChild(createWordCard(word, 'english'));
        });

        shuffledJapaneseWords.forEach(word => {
            japaneseWordsContainer.appendChild(createWordCard(word, 'japanese'));
        });
    }

    function handleCardClick(card) {
        if (card.classList.contains('matched')) return; // すでにマッチ済みのカードは無視

        // 既に選択されている同じタイプのカードがあれば、選択を解除
        if (card.dataset.type === 'english' && selectedEnglishCard && selectedEnglishCard !== card) {
            selectedEnglishCard.classList.remove('selected');
            selectedEnglishCard = null; // 一度クリア
        } else if (card.dataset.type === 'japanese' && selectedJapaneseCard && selectedJapaneseCard !== card) {
            selectedJapaneseCard.classList.remove('selected');
            selectedJapaneseCard = null; // 一度クリア
        }

        card.classList.toggle('selected'); // 選択状態を切り替える

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

            const isMatch = wordPairs.some(pair => 
                pair.english === englishWord && pair.japanese === japaneseWord
            );

            if (isMatch) {
                // 正解！
                correctSound.play();
                messageDisplay.textContent = 'やったね！せいかい！';
                
                animateOwlHappy(); // 正解時にフクロウを嬉しそうにアニメーション

                selectedEnglishCard.classList.add('matched');
                selectedJapaneseCard.classList.add('matched');
                selectedEnglishCard.classList.remove('selected');
                selectedJapaneseCard.classList.remove('selected');

                // キラキラエフェクト
                createSparkleEffect(selectedEnglishCard);
                createSparkleEffect(selectedJapaneseCard);

                selectedEnglishCard = null;
                selectedJapaneseCard = null;
                matchedCount++;

                if (matchedCount === wordPairs.length) {
                    messageDisplay.textContent = 'おめでとう！全部クリアしたよ！';
                    resetButton.style.display = 'block';
                    // 全クリア時もフクロウは嬉しいまま
                }
            } else {
                // 不正解...
                wrongSound.play();
                messageDisplay.textContent = 'あれれ？ちがうみたいだよ。';
                
                animateOwlConfused(); // 不正解時にフクロウを困った顔にアニメーション

                // 少し時間をおいて選択解除
                setTimeout(() => {
                    selectedEnglishCard.classList.remove('selected');
                    selectedJapaneseCard.classList.remove('selected');
                    selectedEnglishCard = null;
                    selectedJapaneseCard = null;
                    messageDisplay.textContent = ''; // メッセージをクリア
                    // 全クリア時以外はキャラクターを通常状態に戻す
                    if (matchedCount !== wordPairs.length) { 
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

        for (let i = 0; i < 10; i++) { // 10個のキラキラを生成
            const sparkle = document.createElement('div');
            sparkle.classList.add('sparkle');
            const size = Math.random() * 8 + 4; // 4pxから12px
            sparkle.style.width = `${size}px`;
            sparkle.style.height = `${size}px`;

            // カードの中心から少し散らばるように調整
            const offsetX = (Math.random() - 0.5) * rect.width * 0.8;
            const offsetY = (Math.random() - 0.5) * rect.height * 0.8;

            sparkle.style.left = `${startX + offsetX}px`;
            sparkle.style.top = `${startY + offsetY}px`;
            
            sparkleContainer.appendChild(sparkle);

            // アニメーション終了後に要素を削除
            sparkle.addEventListener('animationend', () => {
                sparkle.remove();
            });
        }
    }

    // --- 新規追加した音声再生関数 ---
    function speakEnglishWord(word) {
        if (synth.speaking) { // すでに何か話している場合は中断
            synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(word);
        if (englishVoice) {
            utterance.voice = englishVoice;
        } else {
            utterance.lang = 'en-US'; // 英語の音声が見つからない場合のフォールバック
        }
        utterance.rate = 0.9; // 少しゆっくりめに話す（必要に応じて調整）
        utterance.pitch = 1; // ピッチ（声の高さ）
        
        synth.speak(utterance);
    }
    // --- 音声再生関数終わり ---


    resetButton.addEventListener('click', generateGame);

    // ゲーム開始
    generateGame();
});