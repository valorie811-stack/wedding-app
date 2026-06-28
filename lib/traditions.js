// Authored traditions content for the two weddings, in EN / VI / 中文.
// `code`: HP (Vietnam), KK (Malaysia/Chinese), or null (shared). Rendered by
// components/traditions/TraditionsView in the reader's current language.

export const TRADITIONS = [
  {
    id: "symbolism",
    code: null,
    icon: "🧧",
    title: {
      en: "Colours & symbols",
      vi: "Màu sắc & biểu tượng",
      zh: "色彩与象征",
    },
    summary: {
      en: "Across both cultures, red signifies luck, joy and prosperity, while gold represents wealth and good fortune. You'll see them woven through attire, décor, and gifts at every ceremony.",
      vi: "Trong cả hai nền văn hóa, màu đỏ tượng trưng cho may mắn, hạnh phúc và thịnh vượng, còn màu vàng kim biểu trưng cho tài lộc. Hai màu này xuất hiện trong trang phục, trang trí và lễ vật ở mọi nghi lễ.",
      zh: "在两种文化中，红色象征幸运、喜悦与繁荣，金色代表财富与吉祥。在每一场仪式的服饰、布置与礼品中都能看到它们。",
    },
    customs: [
      {
        en: "The double-happiness character 囍 is a classic wedding emblem in Chinese tradition.",
        vi: "Chữ Song Hỷ 囍 là biểu tượng cưới hỏi cổ điển trong văn hóa Hoa.",
        zh: "“囍”字是华人婚礼的经典符号。",
      },
      {
        en: "Even or odd numbers of gifts carry meaning — confirm the count with each family's elders.",
        vi: "Số lượng lễ vật chẵn hay lẻ đều mang ý nghĩa — hãy xác nhận với các bậc trưởng bối mỗi bên.",
        zh: "礼品数目的单双都有讲究——请与双方长辈确认数量。",
      },
    ],
  },
  {
    id: "dam-ngo",
    code: "HP",
    icon: "🍵",
    title: {
      en: "Family Introduction — Lễ Dạm Ngõ",
      vi: "Lễ Dạm Ngõ",
      zh: "提亲 — Lễ Dạm Ngõ",
    },
    summary: {
      en: "The first formal visit, where the groom's family calls on the bride's family to ask permission for the couple to marry. It is small and intimate — usually just close relatives.",
      vi: "Buổi gặp mặt chính thức đầu tiên, nhà trai đến thưa chuyện với nhà gái để xin phép cho đôi trẻ tìm hiểu và tiến tới hôn nhân. Buổi lễ nhỏ, ấm cúng — thường chỉ có người thân.",
      zh: "男方家庭首次正式拜访女方家庭，提请允许两人结为连理。仪式简单亲切，通常只有至亲参加。",
    },
    customs: [
      {
        en: "The groom's family brings simple gifts: betel and areca, tea, and cakes.",
        vi: "Nhà trai mang lễ vật đơn giản: trầu cau, trà và bánh.",
        zh: "男方带上简单的礼品：槟榔与蒌叶、茶和糕点。",
      },
      {
        en: "Both families agree on the date and scope of the engagement ceremony to follow.",
        vi: "Hai gia đình thống nhất ngày và quy mô của Lễ Ăn Hỏi sắp tới.",
        zh: "两家商定随后订婚礼的日期与规模。",
      },
    ],
  },
  {
    id: "an-hoi",
    code: "HP",
    icon: "🎁",
    title: {
      en: "Engagement Ceremony — Lễ Ăn Hỏi",
      vi: "Lễ Ăn Hỏi",
      zh: "订婚礼 — Lễ Ăn Hỏi",
    },
    summary: {
      en: "The betrothal. The groom's family processes to the bride's home carrying lacquered gift trays (mâm quả), carried by unmarried young people, to formally request the marriage.",
      vi: "Lễ đính hôn. Nhà trai rước mâm quả sơn son đến nhà gái, do các nam thanh nữ tú chưa lập gia đình bưng, để chính thức xin cưới.",
      zh: "订婚仪式。男方队伍抬着朱漆礼盘（mâm quả），由未婚青年男女捧持，前往女方家正式提亲。",
    },
    customs: [
      {
        en: "Trays hold betel and areca, tea, wine, cakes, fruit and often a roast — counted in a number agreed by both families.",
        vi: "Mâm quả gồm trầu cau, trà, rượu, bánh, trái cây và thường có heo quay — với số lượng do hai nhà thỏa thuận.",
        zh: "礼盘内有槟榔蒌叶、茶、酒、糕点、水果，常配烧猪——数量由两家商定。",
      },
      {
        en: "The bride wears the áo dài and is presented to the groom's family at the ancestral altar.",
        vi: "Cô dâu mặc áo dài và ra mắt nhà trai trước bàn thờ gia tiên.",
        zh: "新娘身着奥黛（áo dài），在祖先牌位前拜见男方家人。",
      },
      {
        en: "A portion of each gift is returned to the groom's family — never take an empty tray home.",
        vi: "Một phần lễ vật được lại quả cho nhà trai — không bao giờ mang mâm rỗng về.",
        zh: "每份礼品回赠一部分给男方——切忌空盘而归。",
      },
    ],
  },
  {
    id: "le-cuoi",
    code: "HP",
    icon: "💒",
    title: {
      en: "Wedding Ceremony — Lễ Cưới",
      vi: "Lễ Cưới",
      zh: "婚礼 — Lễ Cưới",
    },
    summary: {
      en: "The wedding day itself. The couple pays respects at the ancestral altar, serves tea to parents and elders, receives blessings, and then celebrates with the banquet.",
      vi: "Ngày cưới chính thức. Đôi vợ chồng làm lễ trước bàn thờ gia tiên, dâng trà cho cha mẹ và các bậc trưởng bối, nhận lời chúc phúc, rồi mở tiệc mừng.",
      zh: "正式的婚礼当天。新人在祖先牌位前行礼，向父母与长辈奉茶，接受祝福，随后举行喜宴。",
    },
    customs: [
      {
        en: "Lighting incense at the ancestral altar invites ancestors to witness the union.",
        vi: "Thắp hương trên bàn thờ gia tiên để mời tổ tiên chứng giám.",
        zh: "在祖先牌位前上香，请祖先见证这桩婚事。",
      },
      {
        en: "Parents and elders give blessings and gifts — often gold jewellery for the bride.",
        vi: "Cha mẹ và trưởng bối ban lời chúc và quà — thường là vàng trang sức cho cô dâu.",
        zh: "父母与长辈给予祝福和礼物——常为给新娘的金饰。",
      },
    ],
  },
  {
    id: "tea-ceremony",
    code: "KK",
    icon: "🍵",
    title: {
      en: "Chinese Tea Ceremony — 敬茶",
      vi: "Lễ Dâng Trà (敬茶)",
      zh: "敬茶礼",
    },
    summary: {
      en: "In Kota Kinabalu, the couple serves tea to elders in order of seniority, formally welcoming each other into their families. It is the heart of a Chinese wedding morning.",
      vi: "Tại Kota Kinabalu, đôi tân lang tân nương dâng trà cho các bậc trưởng bối theo thứ tự vai vế, chính thức ra mắt và gia nhập gia đình hai bên. Đây là nghi thức trung tâm của buổi sáng cưới của người Hoa.",
      zh: "在亚庇，新人按辈分顺序向长辈奉茶，正式融入彼此的家庭。这是华人婚礼上午的核心仪式。",
    },
    customs: [
      {
        en: "The couple kneels or bows and addresses each elder by their proper family title before offering tea with both hands.",
        vi: "Đôi trẻ quỳ hoặc cúi chào, gọi đúng vai vế từng người rồi kính dâng trà bằng hai tay.",
        zh: "新人跪拜或鞠躬，按称谓称呼每位长辈，双手奉上茶。",
      },
      {
        en: "Elders drink, then give red packets (lì xì / 红包) or gold jewellery in return.",
        vi: "Trưởng bối nhận trà, rồi trao lại bao lì xì (红包) hoặc vàng trang sức.",
        zh: "长辈饮茶后，回赠红包或金饰。",
      },
      {
        en: "Sweet additions like lotus seeds or red dates in the tea symbolise a sweet union and early children.",
        vi: "Thêm hạt sen hoặc táo đỏ vào trà tượng trưng cho cuộc hôn nhân ngọt ngào và sớm có con.",
        zh: "茶中加入莲子或红枣，寓意婚姻甜美、早生贵子。",
      },
    ],
  },
];
