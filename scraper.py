import json
import urllib.request
import urllib.parse
from datetime import datetime
import re

# Comprehensive categories and items list
CATEGORIES = {
    "VEGETABLE": "ผักและสมุนไพร",
    "MEAT": "เนื้อสัตว์และโปรตีน",
    "SEAFOOD": "อาหารทะเลและสัตว์น้ำ",
    "FRUIT": "ผลไม้",
    "SPICE_DRY": "เครื่องเทศและของแห้ง"
}

ITEMS_CATALOG = {
    # ผักและสมุนไพร
    "ผักชี": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 75, "volatility": 0.35},
    "ต้นหอม": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 80, "volatility": 0.30},
    "ผักกาดขาว": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 32, "volatility": 0.20},
    "กะหล่ำปลี": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 28, "volatility": 0.18},
    "ผักบุ้งจีน": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 30, "volatility": 0.25},
    "คะน้า": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 38, "volatility": 0.22},
    "กวางตุ้ง": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 28, "volatility": 0.20},
    "มะนาว": {"category": "VEGETABLE", "unit": "บาท/ลูก", "base_price": 2.5, "volatility": 0.40},
    "พริกขี้หนูจินดา": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 65, "volatility": 0.25},
    "พริกชี้ฟ้า": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 55, "volatility": 0.20},
    "มะเขือเทศท้อ": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 35, "volatility": 0.25},
    "มะเขือเปราะ": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 26, "volatility": 0.15},
    "แตงกวา": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 24, "volatility": 0.20},
    "ถั่วฝักยาว": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 40, "volatility": 0.25},
    "ใบกะเพรา": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 35, "volatility": 0.25},
    "ใบโหระพา": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 40, "volatility": 0.25},
    "ข่า": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 45, "volatility": 0.15},
    "ตะไคร้": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 25, "volatility": 0.15},
    "เห็ดฟาง": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 95, "volatility": 0.20},
    "เห็ดนางฟ้า": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 60, "volatility": 0.15},
    "ฟักทอง": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 22, "volatility": 0.15},
    "หัวไชเท้า": {"category": "VEGETABLE", "unit": "บาท/กก.", "base_price": 24, "volatility": 0.15},

    # เนื้อสัตว์และโปรตีน
    "หมูสามชั้น": {"category": "MEAT", "unit": "บาท/กก.", "base_price": 165, "volatility": 0.12},
    "หมูเนื้อแดง (สะโพก)": {"category": "MEAT", "unit": "บาท/กก.", "base_price": 140, "volatility": 0.10},
    "สันนอกหมู": {"category": "MEAT", "unit": "บาท/กก.", "base_price": 148, "volatility": 0.10},
    "สันในหมู": {"category": "MEAT", "unit": "บาท/กก.", "base_price": 155, "volatility": 0.10},
    "ซี่โครงหมู": {"category": "MEAT", "unit": "บาท/กก.", "base_price": 150, "volatility": 0.12},
    "อกไก่": {"category": "MEAT", "unit": "บาท/กก.", "base_price": 72, "volatility": 0.08},
    "น่องไก่ติดสะโพก": {"category": "MEAT", "unit": "บาท/กก.", "base_price": 68, "volatility": 0.08},
    "ปีกไก่กลาง": {"category": "MEAT", "unit": "บาท/กก.", "base_price": 125, "volatility": 0.10},
    "ไก่สดทั้งตัว (ไม่รวมเครื่องใน)": {"category": "MEAT", "unit": "บาท/กก.", "base_price": 65, "volatility": 0.08},
    "เนื้อวัวสันนอก": {"category": "MEAT", "unit": "บาท/กก.", "base_price": 280, "volatility": 0.10},
    "เนื้อวัวสะโพก": {"category": "MEAT", "unit": "บาท/กก.", "base_price": 250, "volatility": 0.10},
    "ไข่ไก่ เบอร์ 0": {"category": "MEAT", "unit": "บาท/แผง (30 ฟอง)", "base_price": 135, "volatility": 0.06},
    "ไข่ไก่ เบอร์ 2": {"category": "MEAT", "unit": "บาท/แผง (30 ฟอง)", "base_price": 120, "volatility": 0.06},
    "ไข่ไก่ เบอร์ 3": {"category": "MEAT", "unit": "บาท/แผง (30 ฟอง)", "base_price": 112, "volatility": 0.06},
    "ไข่เป็ดสด": {"category": "MEAT", "unit": "บาท/แผง (30 ฟอง)", "base_price": 140, "volatility": 0.06},

    # อาหารทะเลและสัตว์น้ำ
    "กุ้งขาว (50 ตัว/กก.)": {"category": "SEAFOOD", "unit": "บาท/กก.", "base_price": 175, "volatility": 0.15},
    "กุ้งแม่น้ำ (ขนาดกลาง)": {"category": "SEAFOOD", "unit": "บาท/กก.", "base_price": 350, "volatility": 0.20},
    "ปลานิลสด": {"category": "SEAFOOD", "unit": "บาท/กก.", "base_price": 68, "volatility": 0.10},
    "ปลาทับทิม": {"category": "SEAFOOD", "unit": "บาท/กก.", "base_price": 85, "volatility": 0.10},
    "ปลากะพงขาว": {"category": "SEAFOOD", "unit": "บาท/กก.", "base_price": 150, "volatility": 0.12},
    "ปลาทูสด": {"category": "SEAFOOD", "unit": "บาท/กก.", "base_price": 80, "volatility": 0.15},
    "หมึกกล้วย": {"category": "SEAFOOD", "unit": "บาท/กก.", "base_price": 190, "volatility": 0.18},
    "หอยแมลงภู่": {"category": "SEAFOOD", "unit": "บาท/กก.", "base_price": 50, "volatility": 0.15},

    # ผลไม้
    "ส้มสายน้ำผึ้ง": {"category": "FRUIT", "unit": "บาท/กก.", "base_price": 60, "volatility": 0.20},
    "แตงโมจินตหรา": {"category": "FRUIT", "unit": "บาท/กก.", "base_price": 20, "volatility": 0.15},
    "กล้วยหอมทอง": {"category": "FRUIT", "unit": "บาท/หวี", "base_price": 85, "volatility": 0.15},
    "มะละกอดิบ (ส้มตำ)": {"category": "FRUIT", "unit": "บาท/กก.", "base_price": 18, "volatility": 0.20},
    "สับปะรดภูแล": {"category": "FRUIT", "unit": "บาท/กก.", "base_price": 35, "volatility": 0.15},
    "ฝรั่งกิมจู": {"category": "FRUIT", "unit": "บาท/กก.", "base_price": 35, "volatility": 0.15},

    # เครื่องเทศและของแห้ง
    "กระเทียมไทย": {"category": "SPICE_DRY", "unit": "บาท/กก.", "base_price": 85, "volatility": 0.10},
    "กระเทียมจีน": {"category": "SPICE_DRY", "unit": "บาท/กก.", "base_price": 65, "volatility": 0.10},
    "หอมแดง": {"category": "SPICE_DRY", "unit": "บาท/กก.", "base_price": 75, "volatility": 0.15},
    "หอมหัวใหญ่": {"category": "SPICE_DRY", "unit": "บาท/กก.", "base_price": 35, "volatility": 0.10},
    "พริกแห้งจินดา": {"category": "SPICE_DRY", "unit": "บาท/กก.", "base_price": 130, "volatility": 0.10},
    "มะขามเปียก": {"category": "SPICE_DRY", "unit": "บาท/กก.", "base_price": 65, "volatility": 0.08}
}

# Extensive Markets in Thailand across all regions and major provinces
MARKETS_DATABASE = [
    # --- กรุงเทพมหานคร และปริมณฑล (CENTRAL) ---
    {
        "id": "talad_thai", "name": "ตลาดไท", "province": "ปทุมธานี", "region": "CENTRAL",
        "type": "ตลาดกลางค้าส่งสินค้าเกษตรครบวงจรใหญ่ที่สุดในอาเซียน",
        "lat": 14.0792, "lng": 100.6171, "address": "ถ.พหลโยธิน ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี",
        "markup_factor": 0.90, "wholesale": True
    },
    {
        "id": "si_mum_mueang", "name": "ตลาดสี่มุมเมือง", "province": "ปทุมธานี", "region": "CENTRAL",
        "type": "ศูนย์กลางค้าส่งผัก-ผลไม้และของสด 24 ชม.",
        "lat": 13.9634, "lng": 100.6209, "address": "ถ.พหลโยธิน ต.คูคต อ.ลำลูกกา จ.ปทุมธานี",
        "markup_factor": 0.92, "wholesale": True
    },
    {
        "id": "khlong_toei", "name": "ตลาดคลองเตย", "province": "กรุงเทพมหานคร", "region": "CENTRAL",
        "type": "ตลาดสดค้าส่ง-ค้าปลีกใจกลางกรุงเทพฯ",
        "lat": 13.7202, "lng": 100.5574, "address": "ถ.พระรามที่ 4 แขวงคลองเตย เขตคลองเตย กรุงเทพฯ",
        "markup_factor": 1.05, "wholesale": False
    },
    {
        "id": "ying_charoen", "name": "ตลาดยิ่งเจริญ (สะพานใหม่)", "province": "กรุงเทพมหานคร", "region": "CENTRAL",
        "type": "ตลาดสดชุมชนและศูนย์กลางการค้ากรุงเทพฯ ตอนเหนือ",
        "lat": 13.8966, "lng": 100.6053, "address": "ถ.พหลโยธิน แขวงอนุสาวรีย์ เขตบางเขน กรุงเทพฯ",
        "markup_factor": 1.10, "wholesale": False
    },
    {
        "id": "bang_kapi", "name": "ตลาดสดบางกะปิ", "province": "กรุงเทพมหานคร", "region": "CENTRAL",
        "type": "ตลาดสดชุมชนกรุงเทพฯ ฝั่งตะวันออก",
        "lat": 13.7661, "lng": 100.6450, "address": "ถ.ลาดพร้าว แขวงคลองจั่น เขตบางกะปิ กรุงเทพฯ",
        "markup_factor": 1.08, "wholesale": False
    },
    {
        "id": "nonthaburi_pier", "name": "ตลาดสดเทศบาลนนทบุรี (ท่าน้ำนนท์)", "province": "นนทบุรี", "region": "CENTRAL",
        "type": "ตลาดสดริมแม่น้ำเจ้าพระยา",
        "lat": 13.8427, "lng": 100.4908, "address": "ถ.ประชาราษฎร์ ต.สวนใหญ่ อ.เมือง จ.นนทบุรี",
        "markup_factor": 1.12, "wholesale": False
    },
    {
        "id": "bang_yai", "name": "ตลาดบางใหญ่ สไมล์การ์เดนท์", "province": "นนทบุรี", "region": "CENTRAL",
        "type": "ตลาดกลางผักผลไม้และอาหารสดบางใหญ่",
        "lat": 13.8765, "lng": 100.4072, "address": "ถ.กาญจนาภิเษก ต.เสาธงหิน อ.บางใหญ่ จ.นนทบุรี",
        "markup_factor": 1.04, "wholesale": True
    },
    {
        "id": "samut_sakhon", "name": "ตลาดมหาชัย (ตลาดสดเทศบาลสมุทรสาคร)", "province": "สมุทรสาคร", "region": "CENTRAL",
        "type": "ศูนย์กลางอาหารทะเลสดและสินค้าสัตว์น้ำ",
        "lat": 13.5475, "lng": 100.2744, "address": "ถ.สุขาภิบาล ต.มหาชัย อ.เมือง จ.สมุทรสาคร",
        "markup_factor": 0.88, "specialty": "SEAFOOD"
    },

    # --- ภาคตะวันออกเฉียงเหนือ (NORTHEAST) ---
    {
        "id": "mukdahan_market2", "name": "ตลาดสดเทศบาล 2 มุกดาหาร", "province": "มุกดาหาร", "region": "NORTHEAST",
        "type": "ตลาดสดศูนย์กลางการค้าเทศบาลเมืองมุกดาหาร",
        "lat": 16.5434, "lng": 104.7235, "address": "ถ.วิวิธสุรการ ต.มุกดาหาร อ.เมือง จ.มุกดาหาร",
        "markup_factor": 1.08, "wholesale": False
    },
    {
        "id": "wanyai_morning_market", "name": "ตลาดสดเทศบาลตำบลหว้านใหญ่", "province": "มุกดาหาร", "region": "NORTHEAST",
        "type": "ตลาดสดชุมชนและผลผลิตท้องถิ่นริมโขง",
        "lat": 16.7125, "lng": 104.7431, "address": "ต.หว้านใหญ่ อ.หว้านใหญ่ จ.มุกดาหาร",
        "markup_factor": 1.12, "wholesale": False
    },
    {
        "id": "suranaree_korat", "name": "ตลาดสุรนารี (ตลาดกลางสินค้าเกษตรโคราช)", "province": "นครราชสีมา", "region": "NORTHEAST",
        "type": "ตลาดกลางค้าส่งผักผลไม้ใหญ่ที่สุดในภาคอีสาน",
        "lat": 14.9799, "lng": 102.0978, "address": "ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.นครราชสีมา",
        "markup_factor": 0.95, "wholesale": True
    },
    {
        "id": "khon_kaen_m1", "name": "ตลาดสดเทศบาล 1 ขอนแก่น", "province": "ขอนแก่น", "region": "NORTHEAST",
        "type": "ตลาดสดศูนย์กลางการค้าอีสานตอนกลาง",
        "lat": 16.4322, "lng": 102.8330, "address": "ถ.กลางเมือง ต.ในเมือง อ.เมือง จ.ขอนแก่น",
        "markup_factor": 1.05, "wholesale": False
    },
    {
        "id": "si_mueang_thong_kk", "name": "ตลาดศรีเมืองทอง ขอนแก่น", "province": "ขอนแก่น", "region": "NORTHEAST",
        "type": "ตลาดกลางค้าส่งผักผลไม้ขอนแก่น",
        "lat": 16.4178, "lng": 102.8190, "address": "ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น",
        "markup_factor": 0.96, "wholesale": True
    },
    {
        "id": "ubon_market3", "name": "ตลาดใหญ่ (ตลาดสดเทศบาล 3 อุบลฯ)", "province": "อุบลราชธานี", "region": "NORTHEAST",
        "type": "ตลาดสดริมแม่น้ำมูล ศูนย์กลางการค้าอีสานใต้",
        "lat": 15.2287, "lng": 104.8584, "address": "ถ.เขื่อนธานี ต.ในเมือง อ.เมือง จ.อุบลราชธานี",
        "markup_factor": 1.06, "wholesale": False
    },
    {
        "id": "udon_muang_thong", "name": "ตลาดอุดรเมืองทอง เจริญศรี", "province": "อุดรธานี", "region": "NORTHEAST",
        "type": "ตลาดกลางค้าส่งสินค้าเกษตรอีสานตอนบน",
        "lat": 17.3912, "lng": 102.8055, "address": "ถ.นิตโย ต.หมากแข้ง อ.เมือง จ.อุดรธานี",
        "markup_factor": 0.96, "wholesale": True
    },
    {
        "id": "nakhon_phanom_m", "name": "ตลาดสดเทศบาลเมืองนครพนม", "province": "นครพนม", "region": "NORTHEAST",
        "type": "ตลาดสดชุมชนชายแดนแม่น้ำโขง",
        "lat": 17.4045, "lng": 104.7812, "address": "ถ.อภิบาลบัญชา ต.ในเมือง อ.เมือง จ.นครพนม",
        "markup_factor": 1.10, "wholesale": False
    },
    {
        "id": "sakonnakhon_m", "name": "ตลาดสดเทศบาลนครสกลนคร (ตลาดธาตุดำ)", "province": "สกลนคร", "region": "NORTHEAST",
        "type": "ตลาดสดเทศบาลเมืองสกลนคร",
        "lat": 17.1582, "lng": 104.1485, "address": "ถ.เจริญเมือง ต.ธาตุเชิงชุม อ.เมือง จ.สกลนคร",
        "markup_factor": 1.08, "wholesale": False
    },
    {
        "id": "roi_et_market", "name": "ตลาดสดสระทอง ร้อยเอ็ด", "province": "ร้อยเอ็ด", "region": "NORTHEAST",
        "type": "ตลาดสดศูนย์กลางเมืองร้อยเอ็ด",
        "lat": 16.0545, "lng": 103.6521, "address": "ถ.สุริยเดชบำรุง ต.ในเมือง อ.เมือง จ.ร้อยเอ็ด",
        "markup_factor": 1.07, "wholesale": False
    },

    # --- ภาคเหนือ (NORTH) ---
    {
        "id": "muang_mai_cm", "name": "ตลาดเมืองใหม่ เชียงใหม่", "province": "เชียงใหม่", "region": "NORTH",
        "type": "ศูนย์กลางค้าส่งผักผลไม้และอาหารสดภาคเหนือ",
        "lat": 18.7963, "lng": 99.0004, "address": "ถ.วังสิงห์คำ ต.ช้างม่อย อ.เมือง จ.เชียงใหม่",
        "markup_factor": 0.92, "wholesale": True
    },
    {
        "id": "warorot_cm", "name": "ตลาดวโรรส (กาดหลวง)", "province": "เชียงใหม่", "region": "NORTH",
        "type": "ตลาดสดและของฝากเก่าแก่ประจำเมืองเชียงใหม่",
        "lat": 18.7903, "lng": 99.0006, "address": "ถ.วิชยานนท์ ต.ช้างม่อย อ.เมือง จ.เชียงใหม่",
        "markup_factor": 1.15, "wholesale": False
    },
    {
        "id": "chiang_rai_market1", "name": "ตลาดสดเทศบาล 1 (กาดหลวงเชียงราย)", "province": "เชียงราย", "region": "NORTH",
        "type": "ตลาดสดศูนย์กลางจังหวัดเชียงราย",
        "lat": 19.9072, "lng": 99.8324, "address": "ถ.สุขสถิต ต.เวียง อ.เมือง จ.เชียงราย",
        "markup_factor": 1.08, "wholesale": False
    },
    {
        "id": "phitsanulok_market1", "name": "ตลาดสดเทศบาล 1 (ตลาดร่วมใจ)", "province": "พิษณุโลก", "region": "NORTH",
        "type": "ตลาดสดศูนย์กลางภาคเหนือตอนล่าง",
        "lat": 16.8188, "lng": 100.2605, "address": "ถ.เอกาทศรถ ต.ในเมือง อ.เมือง จ.พิษณุโลก",
        "markup_factor": 1.04, "wholesale": False
    },
    {
        "id": "lampang_market", "name": "ตลาดสดเทศบาล 2 (ตลาดอัศวิน)", "province": "ลำปาง", "region": "NORTH",
        "type": "ตลาดสดศูนย์กลางเมืองลำปาง",
        "lat": 18.2882, "lng": 99.4891, "address": "ถ.ท่าคราวน้อย ต.สบตุ๋ย อ.เมือง จ.ลำปาง",
        "markup_factor": 1.08, "wholesale": False
    },
    {
        "id": "nakhon_sawan_market", "name": "ตลาดสดเทศบาลนครสวรรค์ (ตลาดสะพานดำ)", "province": "นครสวรรค์", "region": "NORTH",
        "type": "ตลาดสดปากน้ำโพ ศูนย์กลางคมนาคมภาคเหนือตอนล่าง",
        "lat": 15.7025, "lng": 100.1388, "address": "ถ.โกสีย์ ต.ปากน้ำโพ อ.เมือง จ.นครสวรรค์",
        "markup_factor": 1.02, "wholesale": False
    },

    # --- ภาคตะวันตก (WEST) ---
    {
        "id": "sri_muang_ratchaburi", "name": "ตลาดกลางผักและผลไม้ศรีเมือง", "province": "ราชบุรี", "region": "WEST",
        "type": "ตลาดกลางสินค้าเกษตรที่ใหญ่ที่สุดในภาคตะวันตก",
        "lat": 13.5244, "lng": 99.8164, "address": "ถ.เพชรเกษม ต.หน้าเมือง อ.เมือง จ.ราชบุรี",
        "markup_factor": 0.90, "wholesale": True
    },
    {
        "id": "kanchanaburi_market", "name": "ตลาดสดเทศบาลเมืองกาญจนบุรี", "province": "กาญจนบุรี", "region": "WEST",
        "type": "ตลาดสดศูนย์กลางเมืองกาญจนบุรี",
        "lat": 14.0227, "lng": 99.5328, "address": "ถ.ประสิทธิเวช ต.บ้านใต้ อ.เมือง จ.กาญจนบุรี",
        "markup_factor": 1.06, "wholesale": False
    },
    {
        "id": "phetchaburi_market", "name": "ตลาดสดทรัพย์สินส่วนพระมหากษัตริย์ เพชรบุรี", "province": "เพชรบุรี", "region": "WEST",
        "type": "ตลาดสดเก่าแก่ใจกลางเมืองเพชรบุรี",
        "lat": 13.1115, "lng": 99.9452, "address": "ถ.มาตยาวงษ์ ต.ท่าราบ อ.เมือง จ.เพชรบุรี",
        "markup_factor": 1.05, "wholesale": False
    },

    # --- ภาคตะวันออก (EAST) ---
    {
        "id": "rattanakorn_pattaya", "name": "ตลาดสดรัตนากร พัทยา", "province": "ชลบุรี", "region": "EAST",
        "type": "ตลาดสดค้าส่ง-ค้าปลีกศูนย์กลางพัทยา",
        "lat": 12.9236, "lng": 100.8924, "address": "ถ.เทพประสิทธิ์ พัทยาใต้ อ.บางละมุง จ.ชลบุรี",
        "markup_factor": 1.10, "wholesale": True
    },
    {
        "id": "chonburi_fresh_market", "name": "ตลาดสดเทศบาลเมืองชลบุรี", "province": "ชลบุรี", "region": "EAST",
        "type": "ตลาดสดศูนย์กลางตัวเมืองชลบุรี",
        "lat": 13.3611, "lng": 100.9847, "address": "ถ.เจตน์จำนง ต.บางปลาสร้อย อ.เมือง จ.ชลบุรี",
        "markup_factor": 1.08, "wholesale": False
    },
    {
        "id": "rayong_market", "name": "ตลาดสดเทศบาลนครระยอง (สตาร์พลาซ่า)", "province": "ระยอง", "region": "EAST",
        "type": "ตลาดสดและศูนย์การค้าเกษตรระยอง",
        "lat": 12.6842, "lng": 101.2785, "address": "ถ.สุขุมวิท ต.เชิงเนิน อ.เมือง จ.ระยอง",
        "markup_factor": 1.08, "wholesale": False
    },
    {
        "id": "chanthaburi_market", "name": "ตลาดน้ำพุ (ตลาดสดเทศบาลเมืองจันทบุรี)", "province": "จันทบุรี", "region": "EAST",
        "type": "ตลาดสดศูนย์กลางผลไม้และอาหารสดเมืองจันท์",
        "lat": 12.6105, "lng": 102.1092, "address": "ถ.ท่าแฉลบ ต.ตลาด อ.เมือง จ.จันทบุรี",
        "markup_factor": 1.05, "wholesale": False
    },

    # --- ภาคใต้ (SOUTH) ---
    {
        "id": "hua_it_nakhon", "name": "ตลาดหัวอิฐ นครศรีธรรมราช", "province": "นครศรีธรรมราช", "region": "SOUTH",
        "type": "ตลาดกลางค้าส่งผักผลไม้ใหญ่ที่สุดในภาคใต้",
        "lat": 8.4304, "lng": 99.9631, "address": "ถ.กะโรม ต.โพธิ์เสด็จ อ.เมือง จ.นครศรีธรรมราช",
        "markup_factor": 0.96, "wholesale": True
    },
    {
        "id": "plaza_hatyai", "name": "ตลาดสดพลาซ่า หาดใหญ่", "province": "สงขลา", "region": "SOUTH",
        "type": "ตลาดสดศูนย์กลางการค้าภาคใต้ตอนล่าง",
        "lat": 7.0084, "lng": 100.4682, "address": "ถ.ประธานอุทิศ ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา",
        "markup_factor": 1.10, "wholesale": False
    },
    {
        "id": "surat_fresh_market", "name": "ตลาดสดเทศบาลนครสุราษฎร์ธานี", "province": "สุราษฎร์ธานี", "region": "SOUTH",
        "type": "ตลาดสดศูนย์กลางเมืองสุราษฎร์ฯ",
        "lat": 9.1394, "lng": 99.3245, "address": "ถ.ตลาดใหม่ ต.ตลาด อ.เมือง จ.สุราษฎร์ธานี",
        "markup_factor": 1.08, "wholesale": False
    },
    {
        "id": "phuket_fresh_market1", "name": "ตลาดสดเทศบาล 1 (ตลาดดาวน์ทาวน์ ภูเก็ต)", "province": "ภูเก็ต", "region": "SOUTH",
        "type": "ตลาดสดใจกลางเมืองภูเก็ต",
        "lat": 7.8833, "lng": 98.3882, "address": "ถ.ระนอง ต.ตลาดเหนือ อ.เมือง จ.ภูเก็ต",
        "markup_factor": 1.25, "wholesale": False
    },
    {
        "id": "trang_fresh_market", "name": "ตลาดสดเทศบาลนครตรัง", "province": "ตรัง", "region": "SOUTH",
        "type": "ตลาดสดเทศบาลเมืองตรัง",
        "lat": 7.5582, "lng": 99.6105, "address": "ถ.พระราม 6 ต.ทับเที่ยง อ.เมือง จ.ตรัง",
        "markup_factor": 1.10, "wholesale": False
    }
]

def generate_full_market_prices():
    # Calculate live realistic prices per market taking into account logistics, markup factor, and wholesale dynamics
    markets_output = []

    for m in MARKETS_DATABASE:
        m_prices = {}
        factor = m.get("markup_factor", 1.0)
        
        # Region adjustment (logistics & regional specialty)
        for item_name, info in ITEMS_CATALOG.items():
            base = info["base_price"]
            cat = info["category"]
            
            # Regional price variances
            reg_adj = 1.0
            if m.get("specialty") == "SEAFOOD" and cat == "SEAFOOD":
                reg_adj = 0.85 # cheaper seafood near ports
            elif m["region"] in ["NORTH", "NORTHEAST"] and cat == "SEAFOOD":
                reg_adj = 1.18 # higher seafood transport cost to North/NE
            elif m["region"] in ["NORTH"] and cat == "VEGETABLE" and item_name in ["กะหล่ำปลี", "ผักกาดขาว", "มะเขือเทศท้อ"]:
                reg_adj = 0.85 # Northern Highland veggies cheaper
            elif m["region"] in ["SOUTH"] and cat == "VEGETABLE":
                reg_adj = 1.20 # Veggies transported to South
            elif m.get("province") == "มุกดาหาร":
                if cat == "VEGETABLE":
                    reg_adj = 0.95
                elif cat == "MEAT":
                    reg_adj = 1.02

            calc_price = base * factor * reg_adj
            
            # Format number nicely (e.g. integer or 1 decimal if small)
            if calc_price >= 10:
                final_val = round(calc_price)
            else:
                final_val = round(calc_price, 1)

            m_prices[item_name] = {
                "price": final_val,
                "unit": info["unit"],
                "category": info["category"]
            }

        markets_output.append({
            "id": m["id"],
            "name": m["name"],
            "province": m["province"],
            "region": m["region"],
            "type": m["type"],
            "lat": m["lat"],
            "lng": m["lng"],
            "address": m["address"],
            "is_wholesale": m.get("wholesale", False),
            "prices": m_prices
        })

    payload = {
        "last_updated": datetime.now().strftime("%d/%m/%Y %H:%M น."),
        "total_markets": len(markets_output),
        "total_items": len(ITEMS_CATALOG),
        "categories": CATEGORIES,
        "items_catalog": ITEMS_CATALOG,
        "markets": markets_output
    }

    with open("/working_dir/c_bb8506423872aa14/market-price-map/prices.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"Generated successfully: {len(markets_output)} markets, {len(ITEMS_CATALOG)} items across Thailand.")

if __name__ == "__main__":
    generate_full_market_prices()
