# Auto Post Updater

Yeh do n8n workflows hain. Content calendar ki post, upar se neeche, roz ek dafa Instagram aur Facebook pe jati hai. Drive folder se usi naam ki image milti hai. Caption aur hashtags calendar wali rehti hain. Roz **5:00pm** `digiternative@gmail.com` pe approval mail jati hai. Mail ka link sirf review page kholta hai. **Approve** ke baad post usi din **7:00pm** live hoti hai. **Decline** pe post nahi lagti. TikTok abhi queue mein nahi hai.

## Aap se yeh chahiye

Secrets chat mein mat bhejein. API keys sirf n8n ke Credentials mein daalein.

1. **n8n local** isi Mac pe `http://localhost:5678` pe chalta hai. Cloud account ki zaroorat nahi. Approval mail ka button isi computer ke browser mein khulega. Phone se `localhost` nahi khulta.
2. **Google Sheet** ka link. `templates/posting-calendar.csv` import karein. Sheet ka tab naam `Calendar` rakhein. Sheet ki ID URL mein `/d/` ke baad wali hoti hai.
3. **Google account** jo n8n mein connect hoga. Usi account ko Sheets, Drive, Calendar aur Gmail ki permission chahiye. Gmail se `digiternative@gmail.com` pe mail jaani chahiye. Wahi inbox bhi ho sakti hai.
4. **Google Drive folder** ka link jahan post ki files hon. Folder usi Google account ke sath share ho. Image ya video ke liye file **Anyone with the link** pe hon, warna Instagram aur Facebook media nahi utha pate.
5. **OpenAI API key**, n8n mein Header Auth credential ke naam `OpenAI` se. Header name `Authorization`, value `Bearer sk-...`.
6. **Brand** Config mein set hai: Digiternative, English, Asia/Karachi. Pehli post **9 Oct 2026, 7:00pm** hai.
7. **Abhi sirf Instagram aur Facebook.** Dono Meta Business se connected hon. TikTok baad mein, jab aap kahein.

## Platform credentials

| Platform | n8n credential | Aap ko chahiye | Is version mein kya jata hai |
| --- | --- | --- | --- |
| Instagram | Query Auth, naam `Meta Graph`. Parameter `access_token` | Professional account, Facebook Page se juda, Meta app permissions `instagram_basic` aur `instagram_content_publish`. Config mein Instagram user id | Image ya Reel. Text-only post API se nahi lagti |
| Facebook | Wahi Meta token | Page id, permission `pages_manage_posts` | Text, photo, ya video |
| LinkedIn | Header Auth `LinkedIn`, `Authorization: Bearer ...` | Member ya company URN, `w_member_social` ya organization post permission | Text. Drive image is version mein attach nahi hoti. Mail mein yeh warning dikhegi |
| X | Header Auth `X`, `Authorization: Bearer ...` | Developer app jis mein tweet likhne ki paid access ho | Caption. Image attach nahi hoti |
| YouTube | YouTube OAuth | Video file Drive mein | Video upload. Image post nahi hoti |
| TikTok | Header Auth `TikTok` | Content Posting API. Direct post aksar app audit ke baad hi public hoti hai | Drive link reject hota hai. Video ka URL aap ke TikTok app ke verified domain pe ho. Default privacy `SELF_ONLY` hai |

Jo platform abhi connect nahi karna, us ki row mat banayein. Bina credential ke Approve dabane pe post fail ho kar wapas Pending Approval pe aa jati hai, aur mail mein asli error aata hai.

## Sheet ya calendar mein post kaise likhein

Sheet ki ek row ek platform hai. Waqt `YYYY-MM-DD HH:mm` ho, timezone Config wali. `status` shuru mein `Scheduled`.

`raw_caption` mein asal baat likhein. Tool naye dawe, naye numbers, ya naye links nahi banata. Jo link `cta_link` ya caption mein hai, sirf wahi reh sakta hai.

Google Calendar event ka title:

`Instagram | Winter serum`

`Instagram + LinkedIn | Winter serum` se do rows banti hain.

Description:

```
drive: https://drive.google.com/file/d/FILE_ID/view
caption: Asal message yahan.
niche: skincare
link: https://your-site.com/serum
```

Posted, Declined, Pending Approval, ya Publishing row ko calendar dubara overwrite nahi karta.

## n8n mein lagane ka tareeqa

1. Workflows → Import from File.
2. `workflows/01-prepare-and-ask-approval.json`
3. `workflows/02-review-and-publish.json`
4. Dono workflows ke **Config** node mein `YOUR_SPREADSHEET_ID` ki jagah sheet id. Workflow 01 mein Drive folder, brand, aur `webhookBaseUrl` pehle se bhare hain. `igUserId` aur `facebookPageId` Meta ke baad aate hain.
5. Har node jisme credential warning ho, us pe apna credential select karein. Import ke baad purana id match nahi karega.
6. Workflow 01 ke **Publish At Scheduled Time** node mein workflow 02 select karein.
7. Dono workflows **Active** karein. Bina Active ke approval page nahi khulega, aur 7:00pm ki post bhi nahi chalegi. Production path `/webhook/post-review` hai.

Workflow 01 roz **5:00pm** aur **7:00pm** Asia/Karachi pe chalti hai. 5 baje aaj ki post ki email jati hai. 7 baje wohi post tab lagti hai jab page pe Approve ho chuka ho.

## Pehla test

LinkedIn wali sample row ka `scheduled_at` ab se koi 1 ghanta baad ka likhein. `raw_caption` asli rakhein. Manual Trigger chalayein. Mail mein wahi text hona chahiye jo baad mein post hoga, hashtag ke sath yeh bhi ke tag evergreen hai ya timely, aur kyun. Page pe Decline try karein: sheet mein status `Declined` ho aur platform pe kuch na jaye. Doosri row se Approve try karein.

Subah 9 baje, Karachi time, Drive folder ki woh files jin ki sheet mein row nahi, un ki alag mail aati hai. Woh files khud post nahi hotin.

## Hashtags

Tool engagement-pod tags hata deta hai, jaise follow4follow aur like4like. Har tag ke sath note hota hai. Agar number, rank, ya "viral" ka daawa source mein nahi tha, woh note evergreen kar diya jata hai. Jo text mail mein hai, wahi publish hota hai.
