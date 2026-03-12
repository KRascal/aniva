-- UserDailyEvent.date: String → Date
ALTER TABLE "UserDailyEvent" ALTER COLUMN "date" TYPE DATE USING "date"::date;

-- CharacterDiary.date: String → Date
ALTER TABLE "CharacterDiary" ALTER COLUMN "date" TYPE DATE USING "date"::date;

-- User.birthday: String → Date
ALTER TABLE "User" ALTER COLUMN "birthday" TYPE DATE USING CASE WHEN "birthday" IS NOT NULL AND "birthday" != '' THEN "birthday"::date ELSE NULL END;
